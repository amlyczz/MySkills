from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from .motion import MotionToken

class SafeArea(BaseModel):
    model_config = ConfigDict(extra="allow")
    top: int = 0
    right: int = 0
    bottom: int = 0
    left: int = 0
    unit: Literal["px", "%"] = "px"

class TypographyConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    primaryFont: str = "Inter"
    fallbackFont: Optional[str] = None
    scales: dict[str, str] = Field(default_factory=lambda: {
        "xs": "0.75rem", "sm": "0.875rem", "base": "1rem",
        "lg": "1.125rem", "xl": "1.25rem", "2xl": "1.5rem",
        "3xl": "1.875rem", "4xl": "2.25rem",
    })

class ShapeConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    radii: Optional[dict[str, str]] = None
    shadows: Optional[dict[str, str]] = None

class ThemeConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    colors: dict[str, str] = Field(default_factory=lambda: {
        "primary": "#8B5CF6", "secondary": "#6366F1",
        "accent": "#F59E0B", "bg": "#0F0B1A",
        "text": "#FFFFFF", "textMuted": "#9CA3AF",
    })
    typography: TypographyConfig = Field(default_factory=TypographyConfig)
    shape: Optional[ShapeConfig] = None

class AudioDucking(BaseModel):
    model_config = ConfigDict(extra="allow")
    enabled: bool = True
    duckToVolume: Optional[float] = None
    fadeDurationFrames: Optional[int] = None

class GlobalAudioConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    bgmUrl: Optional[str] = None
    bgmVolume: Optional[float] = None
    sfx: Optional[dict[str, str]] = None
    ducking: Optional[AudioDucking] = None

class PostProcessingConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    colorGrading: Optional[dict[str, Any]] = None
    vignette: Optional[dict[str, Any]] = None
    bloom: Optional[dict[str, Any]] = None
    chromaticAberration: Optional[dict[str, Any]] = None

class GlobalSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    safeArea: Optional[SafeArea] = None
    theme: ThemeConfig = Field(default_factory=ThemeConfig)
    motionTokens: Optional[dict[str, MotionToken]] = None
    audio: Optional[GlobalAudioConfig] = None
    postProcessing: Optional[PostProcessingConfig] = None
