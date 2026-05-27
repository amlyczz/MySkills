"""Audio Design use case — generates TTS voiceover per segment (with actual durations),
BGM, and precise Timeline/SRT based on real audio timing.
"""

import asyncio
import logging
import os
import subprocess
import uuid

logger = logging.getLogger(__name__)

from ...domain.repo_analyzer.entities import Script, ScriptSegment
from ...domain.post_producer.audio_timeline import AudioTimeline, AudioTimelineSegment
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator
from ...domain.task.entities import PipelineStatus, StatusTransitionService
from ...domain.task.interfaces import PipelineTaskRepository
from ..workflow.state import PipelineState
from .output_dir import resolve_output_dir


async def _get_audio_duration(audio_path: str) -> float:
    """Probe actual audio duration in seconds using ffprobe (async)."""
    try:
        process = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audio_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10.0)
        except asyncio.TimeoutError:
            process.kill()
            await process.communicate()
            return 0.0
        if process.returncode == 0 and stdout.strip():
            return float(stdout.strip())
    except (FileNotFoundError, ValueError):
        pass
    return 0.0


def _format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


class AudioDesignUseCase:

    def __init__(
        self,
        voiceover_gen: VoiceoverGenerator,
        bgm_gen: BGMGenerator,
        repository: PipelineTaskRepository,
        status_service: StatusTransitionService,
    ) -> None:
        self.voiceover_gen = voiceover_gen
        self.bgm_gen = bgm_gen
        self.repository = repository
        self.status_service = status_service

    async def __call__(self, state: PipelineState) -> PipelineState:
        # Skip-if-done guard: if voiceover already exists, skip
        if state.get("voiceover_path"):
            logger.info("[AudioDesign] Skipping (voiceover already exists)")
            return {**state}

        task_id = uuid.UUID(state["task_id"])

        # ① Enter node: mark active immediately
        await self.status_service.transition(
            task_id, PipelineStatus.GENERATE_MEDIA, node="audio_design"
        )

        logger.info("[AudioDesign] Starting audio generation with per-segment TTS")

        script = state.get("script")
        if script is None:
            raise ValueError("Script is missing in state for audio design.")

        output_dir = resolve_output_dir(state)
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

            actual_dur = await _get_audio_duration(seg_path)
            if actual_dur <= 0:
                actual_dur = seg.duration_est
            segment_durations.append(actual_dur)
            segment_paths.append(seg_path)
            logger.info(f"[AudioDesign] Segment {i}: est={seg.duration_est:.1f}s actual={actual_dur:.1f}s")

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
        timeline = self._build_timeline(script, segment_durations)
        with open(timeline_path, "w", encoding="utf-8") as f:
            f.write(timeline.model_dump_json(indent=2, by_alias=True))

        # ── 5. Build precise SRT with actual durations ──
        srt_path = os.path.join(output_dir, "subtitles.srt")
        srt_content = self._build_srt(script, segment_durations)
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        # ② Complete node: update via FSM
        await self.status_service.mark_node_completed(
            task_id, "audio_design",
            updates={
                "status": PipelineStatus.GENERATE_MEDIA,
                "voiceover_path": voiceover_path,
                "bgm_path": bgm_path,
            },
        )

        return {
            **state,
            "voiceover_path": voiceover_path,
            "bgm_path": bgm_path,
            "segment_actual_durations": segment_durations,
            "status": PipelineStatus.GENERATE_MEDIA,
        }

    async def _concat_audio(self, segment_paths: list[str], output_path: str) -> None:
        if not segment_paths:
            return

        if len(segment_paths) == 1:
            import shutil
            await asyncio.to_thread(shutil.copy2, segment_paths[0], output_path)
            return

        list_path = output_path + ".concat.txt"
        with open(list_path, "w", encoding="utf-8") as f:
            for p in segment_paths:
                f.write(f"file '{p}'\n")

        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", list_path, "-c", "copy", output_path,
        ]
        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()

        if os.path.exists(list_path):
            os.remove(list_path)

        if process.returncode != 0:
            import shutil
            await asyncio.to_thread(shutil.copy2, segment_paths[0], output_path)
            logger.warning("[AudioDesign] Warning: concat failed, using first segment only")

    def _build_timeline(self, script: Script, actual_durations: list[float]) -> AudioTimeline:
        segments: list[AudioTimelineSegment] = []
        current_time = 0.0
        for i, seg in enumerate(script.segments):
            dur = actual_durations[i] if i < len(actual_durations) else seg.duration_est
            segments.append(AudioTimelineSegment(
                id=f"seg_{i:03d}",
                text=seg.text,
                time_start=round(current_time, 3),
                time_end=round(current_time + dur, 3),
                duration=round(dur, 3),
                assigned_asset=seg.assigned_asset,
                visual_hook=seg.visual_hook,
            ))
            current_time += dur

        return AudioTimeline(
            total_duration=round(current_time, 3),
            total_duration_est=script.total_duration_est,
            segments=segments,
        )

    def _build_srt(self, script: Script, actual_durations: list[float]) -> str:
        srt = ""
        current_time = 0.0
        for i, seg in enumerate(script.segments):
            dur = actual_durations[i] if i < len(actual_durations) else seg.duration_est
            start = current_time
            end = current_time + dur
            srt += f"{i + 1}\n{_format_srt_time(start)} --> {_format_srt_time(end)}\n{seg.text}\n\n"
            current_time += dur
        return srt
