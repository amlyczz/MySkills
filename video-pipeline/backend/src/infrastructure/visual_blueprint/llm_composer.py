"""Layered Blueprint generation — 3 steps instead of 1.

Step 1: Scene skeleton — scene types, durations, backgrounds, transitions
Step 2: Per-scene elements — element trees with animation for each scene
Step 3: Assembly — add voiceover, subtitles, SFX programmatically

This dramatically improves reliability over single-shot generation because:
- Each step has a focused, simpler task
- Step 2 can be parallelized across scenes
- Step 3 is deterministic (no LLM needed)
"""

import json
import logging
import re
import uuid
from typing import Any, Optional

logger = logging.getLogger(__name__)

import pydantic
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from ...domain.repo_analyzer.entities import ContentModel, DomainAnalysis, Script, ScriptSegment
from ...domain.visual_blueprint.entities import (
    Blueprint, BlueprintMeta, SceneConfig, ElementConfig, GlobalSettings,
    ThemeConfig, TypographyConfig, AnimationConfig, AnimationTimeline,
    StaggerConfig, TransitionToNext, VoiceoverConfig, SubtitleConfig,
    SubtitleToken, SfxTrigger, SceneBackground, ElementLayout,
    GlobalAudioConfig, AudioDucking,
)
from ...domain.visual_blueprint.interfaces import BlueprintComposer
from ..llm.client import get_llm, LLMRole
from ..llm.prompt_loader import load_prompt


def _extract_json(text: str) -> dict | None:
    """Extract JSON object from LLM output (handles markdown fences and extra text)."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    return None


# ── Lenient models for LLM output fixup before strict Blueprint validation ──

class _FixupElement(pydantic.BaseModel):
    """Element that accepts missing id and string-style decorations."""
    type: str
    id: str = ""
    style: Any = pydantic.Field(default_factory=dict)
    model_config = pydantic.ConfigDict(extra="allow")

    @pydantic.model_validator(mode="after")
    def _ensure_id(self) -> "_FixupElement":
        if not self.id:
            self.id = f"elem_{uuid.uuid4().hex[:8]}"
        return self

    @pydantic.field_validator("style", mode="before")
    @classmethod
    def _coerce_style(cls, v: Any) -> Any:
        if isinstance(v, str):
            # LLM outputs decoration type name as a string (e.g. "film-grain")
            return {"decoration_type": v}
        return v if v else {}


class _FixupScene(pydantic.BaseModel):
    """Scene that accepts both string and object backgrounds, and coerces null/list voiceover/subtitles."""
    id: str
    type: str
    startFrame: int = 0
    durationInFrames: int
    background: Any = pydantic.Field(default_factory=lambda: {"type": "solid-color", "color": "#0a0a0a"})
    elements: list[_FixupElement] = []
    voiceover: Any = None
    subtitles: Any = None
    sfx: Any = None
    model_config = pydantic.ConfigDict(extra="allow")

    @pydantic.field_validator("background", mode="before")
    @classmethod
    def _coerce_background(cls, v: Any) -> Any:
        if isinstance(v, str):
            return {"type": "solid-color", "color": "#0a0a0a"}
        return v

    @pydantic.field_validator("voiceover", "subtitles", mode="before")
    @classmethod
    def _coerce_voiceover_subtitles(cls, v: Any) -> Any:
        """LLM outputs [] or null for these fields — set to None so Step 3 can fill them."""
        if v is None or (isinstance(v, list) and len(v) == 0):
            return None
        if isinstance(v, list):
            return None  # Invalid format, let Step 3 fill programmatically
        if isinstance(v, dict):
            return v  # Proper dict format, pass through
        return None


class _FixupGlobalSettings(pydantic.BaseModel):
    """GlobalSettings that accepts both list and dict motionTokens, and fixes flattened easing."""
    motionTokens: Any = pydantic.Field(default_factory=dict)
    theme: Any = pydantic.Field(default_factory=ThemeConfig)
    audio: Any = None
    model_config = pydantic.ConfigDict(extra="allow")

    @pydantic.field_validator("theme", mode="before")
    @classmethod
    def _coerce_theme(cls, v: Any) -> Any:
        if v is None or isinstance(v, str):
            # LLM outputs theme as a string like "dark-neon" → use default ThemeConfig
            return ThemeConfig().model_dump()
        if isinstance(v, dict):
            # If LLM nested colors/typography inside a "colors"/"typography" key correctly, pass through
            return v
        return ThemeConfig().model_dump()

    @pydantic.field_validator("audio", mode="before")
    @classmethod
    def _coerce_audio(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, dict):
            # Fix ducking: LLM sometimes outputs bool instead of AudioDucking object
            ducking = v.get("ducking")
            if isinstance(ducking, bool):
                v["ducking"] = {"enabled": ducking, "duckToVolume": 0.2 if ducking else None}
            elif isinstance(ducking, dict) and "enable" in ducking and "enabled" not in ducking:
                # LLM uses "enable" instead of "enabled"
                ducking["enabled"] = ducking.pop("enable")
            return v
        return None

    @pydantic.field_validator("motionTokens", mode="before")
    @classmethod
    def _coerce_motion_tokens(cls, v: Any) -> Any:
        if v is None:
            return {}
        if isinstance(v, list):
            # LLM outputs tokens as list of objects → convert to dict by name
            result = {}
            for item in v:
                name = item.get("name", item.get("type", f"token_{len(result)}"))
                result[name] = cls._wrap_easing(item)
            return result
        if isinstance(v, dict):
            return {k: cls._wrap_easing(t) for k, t in v.items() if isinstance(t, dict)}
        return {}

    @staticmethod
    def _wrap_easing(token: dict) -> dict:
        """Wrap LLM's flattened token into proper {easing: {type, params/bezier}}."""
        if "easing" in token:
            return token  # Already correctly structured
        # LLM puts easing fields directly on the token object
        ttype = token.get("type", "spring")
        if ttype == "spring":
            return {
                "easing": {
                    "type": "spring",
                    "params": {
                        "mass": token.get("mass", 1),
                        "damping": token.get("damping", token.get("damping", 14)),
                        "stiffness": token.get("stiffness", 120),
                    },
                },
            }
        elif ttype == "bezier":
            return {
                "easing": {
                    "type": "bezier",
                    "bezier": token.get("bezier", [0.25, 0.1, 0.25, 1.0]),
                },
            }
        else:
            return {"easing": {"type": "linear"}}


class _FixupBlueprint(pydantic.BaseModel):
    """Lenient wrapper that fixes LLM output then produces strict Blueprint."""
    globalSettings: _FixupGlobalSettings = pydantic.Field(default_factory=_FixupGlobalSettings)
    globalBackground: Any = None
    scenes: list[_FixupScene] = []
    meta: dict[str, Any] = pydantic.Field(
        default_factory=lambda: {
            "id": str(uuid.uuid4()),
            "name": "Auto-generated Blueprint",
            "generated_by": "deepseek",
            "blueprint_type": "dynamic",
            "version": "2.0",
        },
    )
    model_config = pydantic.ConfigDict(extra="allow")

    @pydantic.field_validator("meta", mode="before")
    @classmethod
    def _ensure_meta_fields(cls, v: Any) -> dict:
        if not isinstance(v, dict):
            v = {}
        v.setdefault("id", str(uuid.uuid4()))
        v.setdefault("name", "Auto-generated Blueprint")
        return v

    @pydantic.field_validator("globalBackground", mode="before")
    @classmethod
    def _coerce_global_background(cls, v: Any) -> Any:
        if isinstance(v, str):
            return None  # LLM outputs theme name as string, just ignore
        return v

    def to_blueprint(self) -> "Blueprint":
        return Blueprint.model_validate(self.model_dump())


def _fixup_blueprint(data: dict) -> "Blueprint":
    """Parse lenient LLM output and convert to strict Blueprint via Pydantic fixup chain."""
    return _FixupBlueprint.model_validate(data).to_blueprint()

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
        self.llm = get_llm(LLMRole.EXTRACTION)

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
            SystemMessagePromptTemplate.from_template(load_prompt("visual_blueprint", "step1_skeleton_system.md"), template_format="jinja2"),
            HumanMessagePromptTemplate.from_template(load_prompt("visual_blueprint", "step1_skeleton_user.md")),
        ])

        segments_repr = self._serialize_segments(script)
        content_title = content.content.title if content.content else "Untitled"
        content_tagline = content.content.tagline if content.content else ""
        content_points = content.content.use_cases if content.content else ""

        feedback_section = ""
        if qa_feedback:
            feedback_section = f"\n{qa_feedback}\n\nThis is a RETRY. Address the deficiencies above."

        # Extract domain analysis fields (with defaults if not provided)
        architecture_pattern = domain_analysis.architecture_pattern if domain_analysis else ""
        audience_primary = domain_analysis.audience.primary if domain_analysis else "developer"
        audience_expertise = domain_analysis.audience.expertise_level if domain_analysis else "intermediate"
        narrative_angle = domain_analysis.narrative.angle if domain_analysis else ""
        technical_depth = domain_analysis.technical_depth if domain_analysis else "moderate"

        # Primary: function_calling strict mode with _FixupBlueprint (server-side schema enforcement)
        # Then convert to strict Blueprint via to_blueprint()
        invoke_params = {
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
        }

        try:
            chain = prompt | self.llm.with_structured_output(_FixupBlueprint, method="function_calling", strict=True)
            fixup_result: _FixupBlueprint = await chain.ainvoke(invoke_params)
            blueprint = fixup_result.to_blueprint()
        except Exception as fc_err:
            logger.warning("function_calling strict mode failed (%s), falling back to raw JSON + fixup", fc_err)
            raw_chain = prompt | self.llm
            raw_response = await raw_chain.ainvoke({
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
            raw_text = raw_response.content if hasattr(raw_response, "content") else str(raw_response)
            raw_data = _extract_json(raw_text)
            if raw_data is None:
                raise ValueError(f"Failed to parse Blueprint JSON. Raw response (first 1000 chars):\n{raw_text[:1000]}")
            try:
                blueprint = _fixup_blueprint(raw_data)
            except Exception as fixup_err:
                scene_count = len(raw_data.get("scenes", [])) if isinstance(raw_data, dict) else "N/A"
                raise ValueError(
                    f"Blueprint fixup failed after parsing {scene_count} raw scenes. "
                    f"Fixup error: {fixup_err}. "
                    f"Raw JSON keys: {list(raw_data.keys()) if isinstance(raw_data, dict) else 'not a dict'}."
                ) from fixup_err

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
        content_points = content.content.use_cases if content.content else ""

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
        user_prompt += "\nOutput a complete SceneConfig with rich elements and animations. Respond in valid JSON format conforming to the expected schema."

        prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(load_prompt("visual_blueprint", "step2_elements_system.md"), template_format="jinja2"),
            ("user", "{scene_context}"),
        ])

        try:
            chain = prompt | self.llm.with_structured_output(_FixupScene, method="function_calling", strict=True)
            fixup_scene: _FixupScene = await chain.ainvoke({"scene_context": user_prompt})
            # Preserve skeleton metadata
            fixup_scene.id = scene.id
            fixup_scene.startFrame = scene.startFrame
            fixup_scene.durationInFrames = scene.durationInFrames
            filled = SceneConfig.model_validate(fixup_scene.model_dump())
        except Exception as fc_err:
            logger.warning("Step2 function_calling strict mode failed for scene %s (%s), falling back to raw JSON",
                scene.id, str(fc_err)[:100])
            raw_chain = prompt | self.llm
            raw_response = await raw_chain.ainvoke({"scene_context": user_prompt})
            raw_text = raw_response.content if hasattr(raw_response, "content") else str(raw_response)
            raw_data = _extract_json(raw_text)
            if raw_data is None:
                raise ValueError(f"Failed to parse SceneConfig JSON for scene {scene.id}. Raw (500 chars): {raw_text[:500]}")
            raw_data["id"] = scene.id
            raw_data.setdefault("type", scene.type)
            raw_data.setdefault("startFrame", scene.startFrame)
            raw_data.setdefault("durationInFrames", scene.durationInFrames)
            if "background" not in raw_data:
                raw_data["background"] = scene.background.model_dump() if scene.background else {"type": "solid-color", "color": "#000000"}
            filled = SceneConfig.model_validate(_FixupScene.model_validate(raw_data).model_dump())

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
