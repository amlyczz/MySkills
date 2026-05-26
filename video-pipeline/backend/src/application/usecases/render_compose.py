"""Render & Compose use case — calibrates Blueprint frames using actual audio
durations, renders video via Remotion, then mixes audio and burns subtitles.
"""

import logging
import os
import uuid

from ...domain.visual_blueprint.entities import Blueprint
from ...domain.visual_blueprint.interfaces import VideoRenderer
from ...domain.post_producer.interfaces import AudioMixer
from ...domain.task.entities import PipelineStatus, StatusTransitionService
from ...domain.task.interfaces import PipelineTaskRepository
from ..workflow.state import PipelineState
from .output_dir import resolve_output_dir

logger = logging.getLogger(__name__)


def _recalibrate_blueprint(
    blueprint: Blueprint,
    actual_durations: list[float],
) -> Blueprint:
    """Recalibrate Blueprint frame positions based on actual TTS audio durations."""
    FPS = 30

    scenes = blueprint.scenes
    if not scenes:
        return blueprint

    current_frame = 0
    for i, scene in enumerate(scenes):
        if i < len(actual_durations) and actual_durations[i] > 0:
            actual_frames = int(actual_durations[i] * FPS)
            est_frames = scene.durationInFrames
            if abs(actual_frames - est_frames) > FPS * 0.5:
                scene.durationInFrames = actual_frames

        scene.startFrame = current_frame
        current_frame += scene.durationInFrames

        if scene.voiceover:
            scene.voiceover.startFrame = scene.startFrame
            scene.voiceover.endFrame = scene.startFrame + scene.durationInFrames

        if scene.subtitles and scene.subtitles.tokens:
            total_tok_frames = scene.durationInFrames
            n_tokens = len(scene.subtitles.tokens)
            for j, token in enumerate(scene.subtitles.tokens):
                tok_start = scene.startFrame + int(j * total_tok_frames / n_tokens)
                tok_end = scene.startFrame + int((j + 1) * total_tok_frames / n_tokens)
                token.fromFrame = tok_start
                token.toFrame = min(tok_end, scene.startFrame + scene.durationInFrames)

        for element in scene.elements:
            if element.animation and element.animation.timeline:
                timeline = element.animation.timeline
                if timeline.outFrame and timeline.outFrame > scene.durationInFrames:
                    timeline.outFrame = scene.durationInFrames - 15

    return blueprint


class RenderComposeUseCase:

    def __init__(
        self,
        video_renderer: VideoRenderer,
        audio_mixer: AudioMixer,
        repository: PipelineTaskRepository,
        semaphore: object,
        status_service: StatusTransitionService,
    ) -> None:
        self.video_renderer = video_renderer
        self.audio_mixer = audio_mixer
        self.repository = repository
        self.semaphore = semaphore
        self.status_service = status_service

    async def __call__(self, state: PipelineState) -> PipelineState:
        # Skip-if-done guard: if final video exists, skip
        if state.get("final_mp4_path"):
            logger.info("[RenderCompose] Skipping (final video already exists)")
            return PipelineState(
                task_id=state["task_id"],
                repo_url=state["repo_url"],
            )

        import asyncio

        task_id = uuid.UUID(state["task_id"])

        # ① Enter node: mark active immediately
        await self.status_service.transition(
            task_id, PipelineStatus.RENDERING, node="render_compose"
        )

        blueprint = state.get("blueprint")
        if blueprint is None:
            raise ValueError("Blueprint is missing in state for rendering.")

        output_dir = resolve_output_dir(state)
        os.makedirs(output_dir, exist_ok=True)

        # ── 1. Recalibrate Blueprint frames using actual audio durations ──
        if state.get("segment_actual_durations"):
            logger.info("[RenderCompose] Recalibrating Blueprint frames with actual audio durations")
            blueprint = _recalibrate_blueprint(blueprint, state["segment_actual_durations"])

        # ── 2. Render video with calibrated Blueprint ──
        logger.info("[RenderCompose] Waiting for rendering slot...")
        async with self.semaphore:
            video_path = os.path.join(output_dir, "video.mp4")
            await self.video_renderer.render_video(blueprint, video_path)
            logger.info("[RenderCompose] Video rendered: %s", video_path)

        # ── 3. Mix audio and burn subtitles ──
        timeline_path = os.path.join(output_dir, "timeline.json")
        srt_path = os.path.join(output_dir, "subtitles.srt")
        final_mp4_path = os.path.join(output_dir, "final.mp4")

        if state.get("voiceover_path") and state.get("bgm_path") and os.path.exists(video_path):
            await self.audio_mixer.mix_audio_and_burn_subtitles(
                video_path=video_path,
                voiceover_path=state["voiceover_path"],
                bgm_path=state["bgm_path"],
                timeline_path=timeline_path,
                srt_path=srt_path,
                output_path=final_mp4_path,
            )
        else:
            import shutil
            shutil.copy2(video_path, final_mp4_path)

        # ② Complete node: update via FSM
        await self.status_service.mark_node_completed(
            task_id, "render_compose",
            updates={
                "status": PipelineStatus.COMPLETED,
                "video_mp4_path": video_path,
                "final_mp4_path": final_mp4_path,
            },
        )

        return PipelineState(
            task_id=state["task_id"],
            repo_url=state["repo_url"],
            video_mp4_path=video_path,
            final_mp4_path=final_mp4_path,
            blueprint=blueprint,
            status=PipelineStatus.COMPLETED,
        )
