"""
schema_validator.py — Pydantic mirror of the Zod VideoConfig schema.

Provides runtime validation on the Python side, used by:
- allocate.py: validate VideoConfig before passing to Remotion
- llm_matcher.py: validate LLM outputs before rendering

This mirrors the Zod schemas in remotion/src/schemas/VideoConfig.schema.ts
"""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Enums (locked — same as Zod enums) ──

class LayoutType(str, Enum):
    HERO_CENTER = "hero-center"
    SPLIT_LEFT_TEXT = "split-left-text"
    SPLIT_RIGHT_TEXT = "split-right-text"
    FULL_SCREEN_TEXT = "full-screen-text"
    CARD_GRID = "card-grid"
    QUOTE_STYLE = "quote-style"
    STAT_HIGHLIGHT = "stat-highlight"
    MEDIA_FULL = "media-full"
    CODE_DISPLAY = "code-display"
    CENTER_FOCUS_VIDEO = "center-focus-video"
    KINETIC_TYPOGRAPHY = "kinetic-typography"
    FLOATING_GRID = "floating-grid"
    FLY_THROUGH = "fly-through"
    PROMPT_INPUT = "prompt-input"
    SANDWICH_TEXT = "sandwich-text"


class MotionType(str, Enum):
    SPRING_SLIDE_UP = "spring-slide-up"
    SPRING_SLIDE_LEFT = "spring-slide-left"
    ARC_ENTRANCE = "arc-entrance"
    SCALE_FADE = "scale-fade"
    TYPEWRITER = "typewriter"
    REVEAL_MASK = "reveal-mask"
    BOUNCE_IN = "bounce-in"
    BLUR_FOCUS = "blur-focus"
    SPRING_ELASTIC = "spring-elastic"
    SMOOTH_SCALE_UP = "smooth-scale-up"
    STAGGERED_GROW = "staggered-grow"
    FADE_OUT = "fade-out"
    SLIDE_OUT_LEFT = "slide-out-left"
    SCALE_DOWN_OUT = "scale-down-out"
    BLUR_OUT = "blur-out"
    SUBTLE_FLOAT = "subtle-float"
    GLOW_PULSE = "glow-pulse"
    NONE = "none"


class BgType(str, Enum):
    STARFIELD = "starfield"
    BOKEH = "bokeh"
    GEOMETRIC = "geometric"
    PIXEL = "pixel"
    FLUID_GRADIENT = "fluid-gradient"
    NONE = "none"


class TransitionType(str, Enum):
    NONE = "none"
    CROSSFADE = "crossfade"
    WHIP_PAN = "whip-pan"
    SLIDE_IN = "slide-in"
    SLIDE_OUT = "slide-out"


class TransitionDirection(str, Enum):
    LEFT = "left"
    RIGHT = "right"
    UP = "up"
    DOWN = "down"


class WrapperType(str, Enum):
    GLOW = "glow"
    DEVICE_FRAME = "device-frame"


# ── Sub-models ──

class TransitionConfig(BaseModel):
    type: TransitionType = TransitionType.NONE
    direction: Optional[TransitionDirection] = None
    durationFrames: int = Field(default=15, ge=1, le=60)


class CameraAction(BaseModel):
    type: str = "pan-and-zoom"
    targetScale: float = Field(default=1.5, ge=0.5, le=5.0)
    focusPoint: dict = Field(default_factory=lambda: {"x": 960, "y": 540})
    triggerFrame: int = Field(default=0, ge=0)


class BarChartItem(BaseModel):
    label: str
    value: float
    previousValue: Optional[float] = None


class VolumePoint(BaseModel):
    time: float = Field(ge=0)
    volume: float = Field(ge=0, le=1)


class BgmTrack(BaseModel):
    id: str
    src: str
    bpm: Optional[float] = None
    mood: str = "chill"
    volumeCurve: Optional[list[VolumePoint]] = None


class VoiceoverSegment(BaseModel):
    sceneId: str
    elementRole: str
    src: str
    text: str
    durationSeconds: float = Field(gt=0)
    startOffsetSeconds: float = Field(ge=0)


class AudioConfig(BaseModel):
    bgm: Optional[BgmTrack] = None
    sfxEnabled: bool = True
    voiceover: list[VoiceoverSegment] = Field(default_factory=list)
    voiceoverEnabled: bool = False


class SceneConfig(BaseModel):
    layoutId: LayoutType = LayoutType.HERO_CENTER
    motionMap: dict[str, str] = Field(default_factory=dict)
    content: dict[str, str | list[str]] = Field(default_factory=dict)
    durationSeconds: Optional[float] = Field(default=None, ge=1, le=300)
    chartData: Optional[list[BarChartItem]] = None
    cameraAction: Optional[CameraAction] = None
    wrapperType: Optional[WrapperType] = None
    transitionIn: Optional[TransitionConfig] = None
    transitionOut: Optional[TransitionConfig] = None


class VideoConfig(BaseModel):
    """Root schema — validated entry point for Remotion rendering."""
    structureId: str
    styleId: str
    bgType: BgType = BgType.STARFIELD
    sceneConfigs: dict[str, SceneConfig]
    audio: AudioConfig = Field(default_factory=AudioConfig)


# ── Utility functions ──

def validate_video_config(config: dict) -> VideoConfig:
    """Validate and return a VideoConfig. Raises ValidationError on failure."""
    return VideoConfig(**config)


def validate_video_config_safe(config: dict) -> tuple[Optional[VideoConfig], list[str]]:
    """Validate a VideoConfig, returning (result, errors)."""
    try:
        return VideoConfig(**config), []
    except Exception as e:
        return None, [str(e)]


def validate_with_retry(candidates: list[dict]) -> tuple[Optional[VideoConfig], list[str]]:
    """Try multiple candidates, return the first valid one."""
    all_errors: list[str] = []
    for i, candidate in enumerate(candidates):
        result, errors = validate_video_config_safe(candidate)
        if result is not None:
            return result, []
        all_errors.extend(f"[Candidate {i}]: {e}" for e in errors)
    return None, all_errors
