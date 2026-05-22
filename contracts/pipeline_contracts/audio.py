"""
Audio — 音频相关数据契约（旁白、音效、BGM）。

从 timeline-composer 内联模型 + post-producer/schema/models.py 合并而来。
为了让 timeline.py 的 TimelineSegment 能正确引用这些模型，
audio.py 中所有字段使用简化的 ForwardRef 避免循环导入。
"""

from pydantic import BaseModel, Field
from typing import Optional


class VoiceoverSplit(BaseModel):
    """口播分句"""
    text: str = ""
    time_offset: float = 0.0


class VoiceoverSegment(BaseModel):
    """口播段落"""
    text: str = ""
    duration_est: float = 0.0
    splits: list[VoiceoverSplit] = Field(default_factory=list)


class SfxEntry(BaseModel):
    """音效触发器"""
    id: str
    time: float = 0.0
    volume: float = Field(default=0.5, ge=0, le=1)
    repeat_every: Optional[float] = None


class AudioConfig(BaseModel):
    """段落音频配置（来自 timeline_composer.py 的原始定义）"""
    bgm_volume: float = 0.25
    bgm_fade_in: Optional[float] = None
    bgm_fade_out: Optional[float] = None
    sfx: list[SfxEntry] = Field(default_factory=list)


class SegmentAudio(BaseModel):
    """段落音频配置（来自 post-producer/schema/models.py 的独立定义，与 AudioConfig 语义一致）"""
    bgm_volume: Optional[float] = Field(None, ge=0, le=1)
    bgm_fade_in: Optional[float] = None
    bgm_fade_out: Optional[float] = None
    sfx: list[SfxEntry] = Field(default_factory=list)
