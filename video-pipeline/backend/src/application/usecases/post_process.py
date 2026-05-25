import json
import os
import uuid
from datetime import datetime
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator, AudioMixer
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


class PostProcessUseCase:

    def __init__(
        self,
        voiceover_gen: VoiceoverGenerator,
        bgm_gen: BGMGenerator,
        audio_mixer: AudioMixer,
        repository: PipelineTaskRepository,
    ) -> None:
        self.voiceover_gen = voiceover_gen
        self.bgm_gen = bgm_gen
        self.audio_mixer = audio_mixer
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[UseCase] Running PostProcess")

        script = state.get("script")
        video_mp4_path = state.get("video_mp4_path")
        if not script or not video_mp4_path:
            raise ValueError("Script or raw video path is missing in state.")

        output_dir = _resolve_output_dir(state)

        # 1. Generate Voiceover
        voiceover_path = os.path.join(output_dir, "voiceover.mp3")
        full_text = script.full_text if script.full_text else " ".join([seg.text for seg in script.segments])
        await self.voiceover_gen.generate_voiceover(
            text=full_text,
            output_path=voiceover_path,
            voice_id="Chinese (Mandarin)_Male_Announcer",
        )

        # 2. Generate BGM
        bgm_path = os.path.join(output_dir, "bgm.mp3")
        await self.bgm_gen.generate_bgm(
            prompt="tech atmospheric electronic",
            duration=int(script.total_duration_est or 60),
            output_path=bgm_path,
        )

        # 3. Write timeline and SRT from script segments
        timeline_path = os.path.join(output_dir, "timeline.json")
        srt_path = os.path.join(output_dir, "subtitles.srt")

        timeline_data = {
            "segments": [
                {"text": seg.text, "duration_est": seg.duration_est, "assigned_asset": seg.assigned_asset, "visual_hook": seg.visual_hook}
                for seg in script.segments
            ]
        }
        with open(timeline_path, "w", encoding="utf-8") as f:
            json.dump(timeline_data, f, ensure_ascii=False, indent=2)

        srt_content = ""
        current_time = 0.0
        for i, seg in enumerate(script.segments):
            start_time = current_time
            end_time = current_time + (seg.duration_est or 5.0)
            srt_content += f"{i+1}\n{_format_srt_time(start_time)} --> {_format_srt_time(end_time)}\n{seg.text}\n\n"
            current_time = end_time
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        # 4. Mix audio and burn subtitles
        final_mp4_path = os.path.join(output_dir, "final.mp4")
        await self.audio_mixer.mix_audio_and_burn_subtitles(
            video_path=video_mp4_path,
            voiceover_path=voiceover_path,
            bgm_path=bgm_path,
            timeline_path=timeline_path,
            srt_path=srt_path,
            output_path=final_mp4_path,
        )

        # Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.COMPLETED
            task.final_mp4_path = final_mp4_path
            await self.repository.update(task)

        return {
            "final_mp4_path": final_mp4_path,
            "voiceover_path": voiceover_path,
            "bgm_path": bgm_path,
            "status": PipelineStatus.COMPLETED,
        }


def _format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
