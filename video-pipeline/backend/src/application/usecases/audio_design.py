"""Audio Design use case — generates TTS voiceover per segment (with actual durations),
BGM, and precise Timeline/SRT based on real audio timing.

This runs BEFORE video rendering so that actual audio durations can calibrate
Blueprint frame positions.
"""

import json
import os
import subprocess
import sys
import uuid
from datetime import datetime

from ...domain.repo_analyzer.entities import Script, ScriptSegment
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...infrastructure.config.app_config import PROJECT_ROOT
from ..workflow.state import PipelineState


def _resolve_output_dir(state: PipelineState) -> str:
    """Compute output directory following convention: output/{source}/{date}/{repo_name}/"""
    source = state.get("project_category", "github")
    date_str = datetime.now().strftime("%Y-%m-%d")
    repo_url = state.get("repo_url", "unknown")
    repo_name = repo_url.rstrip("/").split("/")[-1] if "/" in repo_url else "unknown"
    output_dir = str(PROJECT_ROOT / "output" / source / date_str / repo_name)
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def _get_audio_duration(audio_path: str) -> float:
    """Probe actual audio duration in seconds using ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audio_path,
            ],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except (subprocess.TimeoutExpired, FileNotFoundError, ValueError):
        pass
    return 0.0


def _format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


class AudioDesignUseCase:
    """Generate voiceover per segment with actual durations, BGM, Timeline, and SRT.

    Key design: TTS is done SEGMENT BY SEGMENT so we get real audio durations
    for each segment. These actual durations drive the Timeline and SRT, replacing
    the old approach of blindly using estimated duration_est values.
    """

    def __init__(
        self,
        voiceover_gen: VoiceoverGenerator,
        bgm_gen: BGMGenerator,
        repository: PipelineTaskRepository,
    ) -> None:
        self.voiceover_gen = voiceover_gen
        self.bgm_gen = bgm_gen
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[AudioDesign] Starting audio generation with per-segment TTS")

        script = state.get("script")
        if not script:
            raise ValueError("Script is missing in state for audio design.")

        output_dir = _resolve_output_dir(state)
        segments_dir = os.path.join(output_dir, "segments")
        os.makedirs(segments_dir, exist_ok=True)

        # ── 1. Per-segment TTS with actual duration measurement ──
        segment_durations: list[float] = []
        segment_paths: list[str] = []

        for i, seg in enumerate(script.segments):
            seg_path = os.path.join(segments_dir, f"seg_{i:03d}.mp3")
            await self.voiceover_gen.generate_voiceover(
                text=seg.text,
                output_path=seg_path,
                voice_id="Chinese (Mandarin)_Male_Announcer",
            )

            actual_dur = _get_audio_duration(seg_path)
            # Fallback: if ffprobe fails, use estimated duration
            if actual_dur <= 0:
                actual_dur = seg.duration_est
            segment_durations.append(actual_dur)
            segment_paths.append(seg_path)
            print(f"[AudioDesign] Segment {i}: est={seg.duration_est:.1f}s actual={actual_dur:.1f}s")

        total_actual_duration = sum(segment_durations)

        # ── 2. Concatenate segment audio into full voiceover ──
        voiceover_path = os.path.join(output_dir, "voiceover.mp3")
        await self._concat_audio(segment_paths, voiceover_path)

        # ── 3. Generate BGM ──
        bgm_path = os.path.join(output_dir, "bgm.mp3")
        await self.bgm_gen.generate_bgm(
            prompt="tech atmospheric electronic",
            duration=int(total_actual_duration or 60),
            output_path=bgm_path,
        )

        # ── 4. Build precise Timeline with actual durations ──
        timeline_path = os.path.join(output_dir, "timeline.json")
        timeline_data = self._build_timeline(script, segment_durations)
        with open(timeline_path, "w", encoding="utf-8") as f:
            json.dump(timeline_data, f, ensure_ascii=False, indent=2)

        # ── 5. Build precise SRT with actual durations ──
        srt_path = os.path.join(output_dir, "subtitles.srt")
        srt_content = self._build_srt(script, segment_durations)
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        # ── 6. Sync DB state ──
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.GENERATE_MEDIA
            await self.repository.update(task)

        return {
            "voiceover_path": voiceover_path,
            "bgm_path": bgm_path,
            "segment_actual_durations": segment_durations,
            "status": PipelineStatus.GENERATE_MEDIA,
        }

    async def _concat_audio(self, segment_paths: list[str], output_path: str) -> None:
        """Concatenate segment audio files into a single voiceover track."""
        if not segment_paths:
            return

        if len(segment_paths) == 1:
            # Simple copy for single segment
            import shutil
            shutil.copy2(segment_paths[0], output_path)
            return

        # Use ffmpeg concat demuxer for multiple segments
        list_path = output_path + ".concat.txt"
        with open(list_path, "w", encoding="utf-8") as f:
            for p in segment_paths:
                f.write(f"file '{p}'\n")

        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", list_path, "-c", "copy", output_path,
        ]
        process = await __import__("asyncio").create_subprocess_exec(
            *cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()

        # Cleanup concat list
        if os.path.exists(list_path):
            os.remove(list_path)

        if process.returncode != 0:
            # Fallback: just use the first segment
            import shutil
            shutil.copy2(segment_paths[0], output_path)
            print(f"[AudioDesign] Warning: concat failed, using first segment only")

    def _build_timeline(self, script: Script, actual_durations: list[float]) -> dict:
        """Build timeline.json with actual audio durations."""
        segments = []
        current_time = 0.0
        for i, seg in enumerate(script.segments):
            dur = actual_durations[i] if i < len(actual_durations) else seg.duration_est
            segments.append({
                "id": f"seg_{i:03d}",
                "text": seg.text,
                "time_start": round(current_time, 3),
                "time_end": round(current_time + dur, 3),
                "duration": round(dur, 3),
                "assigned_asset": seg.assigned_asset,
                "visual_hook": seg.visual_hook,
            })
            current_time += dur

        return {
            "version": "3",
            "total_duration": round(current_time, 3),
            "total_duration_est": script.total_duration_est,
            "segments": segments,
        }

    def _build_srt(self, script: Script, actual_durations: list[float]) -> str:
        """Build SRT content with actual audio durations."""
        srt = ""
        current_time = 0.0
        for i, seg in enumerate(script.segments):
            dur = actual_durations[i] if i < len(actual_durations) else seg.duration_est
            start = current_time
            end = current_time + dur
            srt += f"{i + 1}\n{_format_srt_time(start)} --> {_format_srt_time(end)}\n{seg.text}\n\n"
            current_time += dur
        return srt
