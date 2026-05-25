from typing import Any, Optional, Union
from pydantic import BaseModel, ConfigDict

from .element_config import ElementConfig
from .scene_background import SceneBackground
from .sfx import SfxTrigger
from .subtitles import SubtitleConfig
from .transition import TransitionToNext
from .voiceover import VoiceoverConfig

class SceneConfig(BaseModel):
    """Matches engine SceneConfig exactly."""
    model_config = ConfigDict(extra="allow")
    id: str
    type: str = "generic"  # SceneType —宽松处理
    startFrame: int = 0
    durationInFrames: int = 90
    description: Optional[str] = None
    background: Optional[Union[SceneBackground, None]] = None
    style: Optional[dict[str, Any]] = None
    transitionToNext: Optional[TransitionToNext] = None
    elements: Optional[list[ElementConfig]] = None
    props: Optional[dict[str, Any]] = None
    voiceover: Optional[VoiceoverConfig] = None
    subtitles: Optional[SubtitleConfig] = None
    sfx: Optional[list[SfxTrigger]] = None
