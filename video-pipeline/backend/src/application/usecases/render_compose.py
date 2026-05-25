"""Render & Compose use case — calibrates Blueprint frames using actual audio
durations, renders video via Remotion, then mixes audio and burns subtitles.
"""

import os
import uuid

from ...domain.visual_blueprint.entities import Blueprint, SceneConfig
from ...domain.visual_blueprint.interfaces import VideoRenderer
from ...domain.post_producer.interfaces import AudioMixer
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ..workflow.state import PipelineState
from .output_dir import resolve_output_dir


def _recalibrate_blueprint(
    blueprint: Blueprint,
    actual_durations: list[float],
) -> Blueprint:
    """Recalibrate Blueprint frame positions based on actual TTS audio durations.

    The original Blueprint uses estimated duration_est values for frame positions.
    After TTS generation, we know the real audio durations per segment.
    This function recalculates startFrame for each scene to align with actual audio.
    """
    FPS = 30  # must match Remotion config

    scenes = blueprint.scenes
    if not scenes:
        return blueprint

    current_frame = 0
    for i, scene in enumerate(scenes):
        # Get actual duration for this scene (index maps to script segment)
        if i < len(actual_durations) and actual_durations[i] > 0:
            actual_frames = int(actual_durations[i] * FPS)
            # Only adjust startFrame and durationInFrames if the difference is significant
            est_frames = scene.durationInFrames
            if abs(actual_frames - est_frames) > FPS * 0.5:  # > 0.5s difference
                scene.durationInFrames = actual_frames

        scene.startFrame = current_frame
        current_frame += scene.durationInFrames

        # Adjust voiceover frame range to match scene bounds
        if scene.voiceover:
            scene.voiceover.startFrame = scene.startFrame
            scene.voiceover.endFrame = scene.startFrame + scene.durationInFrames

        # Adjust subtitle token frame ranges proportionally
        if scene.subtitles and scene.subtitles.tokens:
            total_tok_frames = scene.durationInFrames
            n_tokens = len(scene.subtitles.tokens)
            for j, token in enumerate(scene.subtitles.tokens):
                tok_start = scene.startFrame + int(j * total_tok_frames / n_tokens)
                tok_end = scene.startFrame + int((j + 1) * total_tok_frames / n_tokens)
                token.fromFrame = tok_start
                token.toFrame = min(tok_end, scene.startFrame + scene.durationInFrames)

        # Adjust element animation outFrame if it exceeds scene bounds
        for element in scene.elements:
            if element.animation and element.animation.timeline:
                timeline = element.animation.timeline
                if timeline.outFrame and timeline.outFrame > scene.durationInFrames:
                    timeline.outFrame = scene.durationInFrames - 15

    return blueprint


class RenderComposeUseCase:
    """Calibrate frames → Render video → Mix audio + burn subtitles → final.mp4.

    This replaces the old separate render_video + post_process nodes.
    The key improvement: Blueprint frame positions are calibrated against actual
    TTS audio durations BEFORE rendering.
    """

    def __init__(
        self,
        video_renderer: VideoRenderer,
        audio_mixer: AudioMixer,
        repository: object,
        semaphore: object,
    ) -> None:
        self.video_renderer = video_renderer
        self.audio_mixer = audio_mixer
        self.repository = repository
        self.semaphore = semaphore

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        import asyncio

        blueprint = state.get("blueprint")
        if not blueprint:
            raise ValueError("Blueprint is missing in state for rendering.")

        voiceover_path = state.get("voiceover_path")
        bgm_path = state.get("bgm_path")
        actual_durations = state.get("segment_actual_durations", [])

        output_dir = resolve_output_dir(state)
        os.makedirs(output_dir, exist_ok=True)

        # ── 1. Recalibrate Blueprint frames using actual audio durations ──
        if actual_durations:
            print("[RenderCompose] Recalibrating Blueprint frames with actual audio durations")
            blueprint = _recalibrate_blueprint(blueprint, actual_durations)

        # ── 2. Render video with calibrated Blueprint ──
        print("[RenderCompose] Waiting for rendering slot...")
        async with self.semaphore:
            video_path = os.path.join(output_dir, "video.mp4")
            await self.video_renderer.render_video(blueprint, video_path)
            print(f"[RenderCompose] Video rendered: {video_path}")

        # ── 3. Mix audio and burn subtitles ──
        timeline_path = os.path.join(output_dir, "timeline.json")
        srt_path = os.path.join(output_dir, "subtitles.srt")
        final_mp4_path = os.path.join(output_dir, "final.mp4")

        if voiceover_path and bgm_path and os.path.exists(video_path):
            await self.audio_mixer.mix_audio_and_burn_subtitles(
                video_path=video_path,
                voiceover_path=voiceover_path,
                bgm_path=bgm_path,
                timeline_path=timeline_path,
                srt_path=srt_path,
                output_path=final_mp4_path,
            )
        else:
            # Fallback: just use the raw video as final
            import shutil
            shutil.copy2(video_path, final_mp4_path)

        # ── 4. Sync DB state ──
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.COMPLETED
            task.video_mp4_path = video_path
            task.final_mp4_path = final_mp4_path
            await self.repository.update(task)

        return {
            "video_mp4_path": video_path,
            "final_mp4_path": final_mp4_path,
            "blueprint": blueprint,  # Return recalibrated blueprint
            "status": PipelineStatus.COMPLETED,
        }
