from typing import Any, Optional, Union
from pydantic import BaseModel, ConfigDict

from .element_config import ElementConfig
from .scene_background import SceneBackground
from .sfx import SfxTrigger
from .subtitles import SubtitleConfig
from .transition import TransitionToNext
from .voiceover import VoiceoverConfig

class SceneConfig(BaseModel):
    """Blueprint v2: LLM writes seconds, normalize_blueprint() converts to frames for Remotion."""
    model_config = ConfigDict(extra="allow")
    id: str
    type: str = "generic"  # SceneType —宽松处理
    startSec: Optional[float] = None     # 场景起始秒数（通常省略，自动计算）
    durationSec: float = 3.0             # 场景持续秒数
    narrativePhase: Optional[str] = None  # hook | context | deep_dive | climax | resolution
    description: Optional[str] = None
    background: Optional[Union[SceneBackground, None]] = None
    style: Optional[dict[str, Any]] = None
    transitionToNext: Optional[TransitionToNext] = None
    elements: Optional[list[ElementConfig]] = None
    props: Optional[dict[str, Any]] = None
    voiceover: Optional[VoiceoverConfig] = None
    subtitles: Optional[SubtitleConfig] = None
    sfx: Optional[list[SfxTrigger]] = None
