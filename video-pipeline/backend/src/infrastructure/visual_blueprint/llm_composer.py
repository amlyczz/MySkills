"""Layered Blueprint generation — 3 steps instead of 1.

Step 1: Scene skeleton — scene types, durations, backgrounds, transitions
Step 2: Per-scene elements — element trees with animation for each scene
Step 3: Assembly — add voiceover, subtitles, SFX programmatically

This dramatically improves reliability over single-shot generation because:
- Each step has a focused, simpler task
- Step 2 can be parallelized across scenes
- Step 3 is deterministic (no LLM needed)
"""

from typing import Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from ...domain.repo_analyzer.entities import ContentModel, DomainAnalysis, Script, ScriptSegment
from ...domain.visual_blueprint.entities import (
    Blueprint, BlueprintMeta, SceneConfig, ElementConfig, GlobalSettings,
    ThemeConfig, TypographyConfig, AnimationConfig, AnimationTimeline,
    StaggerConfig, TransitionToNext, VoiceoverConfig, SubtitleConfig,
    SubtitleToken, SfxTrigger, SceneBackground, ElementLayout,
    GlobalAudioConfig, AudioDucking,
)
from ...domain.visual_blueprint.interfaces import BlueprintComposer
from ..llm.client import get_llm_client
from ..llm.prompt_loader import load_prompt

FPS = 30


from .schemas import SceneFillRequest


# ─── Step 3: Programmatic Assembly ─────────────────────────────────

def _split_text_into_tokens(text: str) -> list[str]:
    """Split text into subtitle tokens by punctuation marks."""
    import re
    # Split by sentence-ending punctuation, keeping the punctuation
    sentences = re.split(r'(?<=[。！？.!?,，、])\s*', text)
    # Filter empty and merge very short fragments
    tokens = []
    current = ""
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if len(current) + len(s) < 15:
            current += s
        else:
            if current:
                tokens.append(current)
            current = s
    if current:
        tokens.append(current)
    return tokens


def _add_voiceover_to_scene(scene: SceneConfig, seg_text: str) -> None:
    """Programmatically add voiceover config to a scene."""
    scene.voiceover = VoiceoverConfig(
        text=seg_text,
        startFrame=scene.startFrame,
        endFrame=scene.startFrame + scene.durationInFrames,
        volume=1.0,
    )


def _add_subtitles_to_scene(scene: SceneConfig, seg_text: str) -> None:
    """Programmatically add subtitle tokens to a scene."""
    tokens = _split_text_into_tokens(seg_text)
    if not tokens:
        return

    total_frames = scene.durationInFrames
    frames_per_token = total_frames / len(tokens)

    subtitle_tokens = []
    for i, token in enumerate(tokens):
        from_frame = scene.startFrame + int(i * frames_per_token)
        to_frame = scene.startFrame + int((i + 1) * frames_per_token)
        to_frame = min(to_frame, scene.startFrame + total_frames)
        subtitle_tokens.append(SubtitleToken(
            text=token,
            fromFrame=from_frame,
            toFrame=to_frame,
        ))

    scene.subtitles = SubtitleConfig(tokens=subtitle_tokens)


def _add_sfx_to_scene(scene: SceneConfig) -> None:
    """Programmatically add SFX triggers based on scene transitions."""
    sfx_list = []
    if scene.transitionToNext:
        trans_type = scene.transitionToNext.type
        if "slide" in trans_type or "spatial" in trans_type:
            sfx_list.append(SfxTrigger(id="whoosh", frame=scene.startFrame + scene.durationInFrames - 15, volume=0.3))
        elif "wipe" in trans_type:
            sfx_list.append(SfxTrigger(id="swoosh", frame=scene.startFrame + scene.durationInFrames - 15, volume=0.3))
        else:
            sfx_list.append(SfxTrigger(id="soft_transition", frame=scene.startFrame + scene.durationInFrames - 10, volume=0.2))

    # Check for scale-bounce animations → add pop SFX
    for elem in scene.elements:
        if elem.animation and elem.animation.type in ("scale-bounce", "scale-in"):
            sfx_list.append(SfxTrigger(
                id="pop",
                frame=elem.animation.timeline.inFrame if elem.animation.timeline else scene.startFrame + 5,
                volume=0.2,
            ))
            break  # One pop per scene is enough

    if sfx_list:
        scene.sfx = sfx_list


def _apply_decoration_layers(scene: SceneConfig, theme_colors: dict) -> None:
    """Automatically add decoration elements based on narrative phase and theme."""
    from .schemas import _decoration_overlay_layout

    phase = getattr(scene, "narrativePhase", None) or ""
    existing_types = {e.type for e in (scene.elements or [])}

    decorations: list[ElementConfig] = []

    # Dark themes: add subtle film grain for cinematic texture
    bg = theme_colors.get("background", "")
    if bg and bg.startswith("#") and _is_dark_color(bg):
        if "film-grain" not in existing_types:
            decorations.append(ElementConfig(
                id=f"{scene.id}_grain",
                type="film-grain",
                layout=_decoration_overlay_layout(z_index=999),
                animation=AnimationConfig(
                    type="fade-in",
                    timeline=AnimationTimeline(inFrame=0, duration=15),
                ),
            ))

    # Hook/Climax: cinematic letterbox bars
    if phase in ("hook", "climax"):
        if "cinematic-bars" not in existing_types:
            decorations.append(ElementConfig(
                id=f"{scene.id}_cinema",
                type="cinematic-bars",
                layout=_decoration_overlay_layout(z_index=998),
            ))

    # Deep dive with multiple elements: connection lines for tech feel
    if phase == "deep_dive" and len([e for e in (scene.elements or []) if e.type not in (
        "film-grain", "cinematic-bars", "dot-grid-bg", "mesh-gradient-bg",
        "noise-background", "organic-blob", "connection-line", "graphic-overlay",
    )]) >= 2:
        if "connection-line" not in existing_types:
            decorations.append(ElementConfig(
                id=f"{scene.id}_conn",
                type="connection-line",
                layout=_decoration_overlay_layout(z_index=-1),
            ))

    # Deep dive: dot grid background for technical diagrams
    if phase == "deep_dive":
        if "dot-grid-bg" not in existing_types:
            decorations.append(ElementConfig(
                id=f"{scene.id}_dots",
                type="dot-grid-bg",
                layout=_decoration_overlay_layout(z_index=-2),
            ))

    scene.elements = (scene.elements or []) + decorations


def _is_dark_color(hex_color: str) -> bool:
    """Check if a hex color is dark (luminance < 0.3)."""
    try:
        hex_color = hex_color.lstrip("#")
        r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return luminance < 0.3
    except (ValueError, IndexError):
        return False


# ─── Main Composer ──────────────────────────────────────────────────

class LLMBlueprintComposer(BlueprintComposer):

    def __init__(self) -> None:
        self.llm = get_llm_client()

    async def compose_blueprint(
        self,
        script: Script,
        content: ContentModel,
        qa_feedback: Optional[str] = None,
        domain_analysis: Optional[DomainAnalysis] = None,
    ) -> Blueprint:
        # ── Step 1: Generate scene skeleton ──
        blueprint = await self._generate_skeleton(script, content, qa_feedback, domain_analysis)

        if not blueprint.scenes:
            raise ValueError("Step 1 produced zero scenes.")

        # ── Step 2: Fill element trees for each scene ──
        for i, scene in enumerate(blueprint.scenes):
            seg = script.segments[i] if i < len(script.segments) else None
            filled_scene = await self._fill_scene_elements(scene, seg, content)
            blueprint.scenes[i] = filled_scene

        # ── Step 3: Programmatic assembly (decoration, voiceover, subtitles, SFX) ──
        theme_colors = blueprint.globalSettings.theme.colors if blueprint.globalSettings and blueprint.globalSettings.theme else {}
        for i, scene in enumerate(blueprint.scenes):
            seg = script.segments[i] if i < len(script.segments) else None
            _apply_decoration_layers(scene, theme_colors)
            if seg:
                _add_voiceover_to_scene(scene, seg.text)
                _add_subtitles_to_scene(scene, seg.text)
            _add_sfx_to_scene(scene)

        return blueprint

    async def _generate_skeleton(
        self,
        script: Script,
        content: ContentModel,
        qa_feedback: Optional[str],
        domain_analysis: Optional[DomainAnalysis] = None,
    ) -> Blueprint:
        """Step 1: Generate Blueprint with scene skeletons only."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("visual_blueprint", "step1_skeleton_system.md")),
            ("user", load_prompt("visual_blueprint", "step1_skeleton_user.md")),
        ])

        segments_repr = self._serialize_segments(script)
        content_title = content.content.title if content.content else "Untitled"
        content_tagline = content.content.tagline if content.content else ""
        content_points = ", ".join(content.content.points[:6]) if content.content and content.content.points else ""

        feedback_section = ""
        if qa_feedback:
            feedback_section = f"\n{qa_feedback}\n\nThis is a RETRY. Address the deficiencies above."

        # Extract domain analysis fields (with defaults if not provided)
        architecture_pattern = domain_analysis.architecture_pattern if domain_analysis else ""
        audience_primary = domain_analysis.audience.primary if domain_analysis else "developer"
        audience_expertise = domain_analysis.audience.expertise_level if domain_analysis else "intermediate"
        narrative_angle = domain_analysis.narrative.angle if domain_analysis else ""
        technical_depth = domain_analysis.technical_depth if domain_analysis else "moderate"

        chain = prompt | self.llm.with_structured_output(Blueprint)
        blueprint: Blueprint = await chain.ainvoke({
            "script_title": content_title,
            "script_duration": script.total_duration_est,
            "script_segments": segments_repr,
            "content_title": content_title,
            "content_tagline": content_tagline,
            "content_points": content_points,
            "architecture_pattern": architecture_pattern,
            "audience_primary": audience_primary,
            "audience_expertise": audience_expertise,
            "narrative_angle": narrative_angle,
            "technical_depth": technical_depth,
            "feedback_section": feedback_section,
        })

        # Recalculate startFrames to ensure sequential layout
        current_frame = 0
        for scene in blueprint.scenes:
            scene.startFrame = current_frame
            current_frame += scene.durationInFrames

        return blueprint

    async def _fill_scene_elements(
        self,
        scene: SceneConfig,
        segment: Optional[ScriptSegment],
        content: ContentModel,
    ) -> SceneConfig:
        """Step 2: Fill element tree for a single scene via focused LLM call."""
        content_title = content.content.title if content.content else ""
        content_points = ", ".join(content.content.points[:6]) if content.content and content.content.points else ""

        # Build per-scene user prompt from template
        user_prompt = f"""Scene {scene.id}:
- Type: {scene.type}
- Duration: {scene.durationInFrames} frames ({scene.durationInFrames / FPS:.1f}s)
- Background: {scene.background.type if scene.background else 'none'}
"""
        if segment:
            user_prompt += f"- Narration: {segment.text}\n"
            if segment.assigned_asset:
                user_prompt += f"- Assigned Asset: {segment.assigned_asset}\n"
            user_prompt += f"- Visual Hook: {segment.visual_hook}\n"

        user_prompt += f"\nProject: {content_title}\nPoints: {content_points}\n"
        user_prompt += "\nOutput a complete SceneConfig with rich elements and animations."

        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("visual_blueprint", "step2_elements_system.md")),
            ("user", "{scene_context}"),
        ])

        chain = prompt | self.llm.with_structured_output(SceneConfig)
        filled: SceneConfig = await chain.ainvoke({"scene_context": user_prompt})

        # Preserve skeleton fields that shouldn't change
        filled.id = scene.id
        filled.startFrame = scene.startFrame
        filled.durationInFrames = scene.durationInFrames
        filled.background = scene.background
        filled.transitionToNext = scene.transitionToNext

        return filled

    @staticmethod
    def _serialize_segments(script: Script) -> str:
        lines = []
        for i, seg in enumerate(script.segments):
            text_preview = seg.text[:80] + "..." if len(seg.text) > 80 else seg.text
            lines.append(
                f"Segment {i+1}: ({seg.duration_est}s) "
                f"text='{text_preview}' asset={seg.assigned_asset} hook={seg.visual_hook}"
            )
        return "\n".join(lines)
