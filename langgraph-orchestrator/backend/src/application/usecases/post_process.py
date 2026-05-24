import os
import uuid
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator, AudioMixer
from ..workflow.state import PipelineState

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
        
        script = state["video_script"]
        video_mp4_path = state["video_mp4_path"]
        if not script or not video_mp4_path:
            raise ValueError("Script or raw video path is missing in state.")

        output_dir = "x:\\home\\zand\\proj\\MySkills\\output"
        os.makedirs(output_dir, exist_ok=True)
        
        # 1. Generate Voiceover via VoiceoverGenerator interface
        voiceover_path = os.path.join(output_dir, f"voiceover_{state['task_id']}.mp3")
        full_text = " ".join([seg.text for seg in script.segments])
        await self.voiceover_gen.generate_voiceover(
            text=full_text,
            output_path=voiceover_path,
            voice_id="Chinese (Mandarin)_Male_Announcer",
        )

        # 2. Generate BGM via BGMGenerator interface
        bgm_path = os.path.join(output_dir, f"bgm_{state['task_id']}.mp3")
        await self.bgm_gen.generate_bgm(
            prompt="tech atmospheric electronic",
            duration=60,
            output_path=bgm_path,
        )

        timeline_path = os.path.join(output_dir, f"timeline_{state['task_id']}.json")
        with open(timeline_path, "w", encoding="utf-8") as f:
            f.write("{}")

        srt_path = os.path.join(output_dir, f"subtitles_{state['task_id']}.srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write("1\n00:00:00,000 --> 00:00:05,000\n[Subtitles]\n")

        # 3. Mix audio and burn subtitles via AudioMixer interface
        final_mp4_path = os.path.join(output_dir, f"final_{state['task_id']}.mp4")
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
            "status": PipelineStatus.COMPLETED,
        }
