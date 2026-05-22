"""
VideoConfig — 渲染配置的数据契约（Pydantic 等效 Zod schema）。

提供 VideoConfig 的 Python 侧校验，供 pipeline orchestrator 和各层脚本验证使用。
"""

from pydantic import BaseModel, Field
from typing import Optional, Any


class TransitionConfig(BaseModel):
    """场景过渡配置"""
    type: str = "crossfade"
    durationFrames: int = 15


class SceneConfig(BaseModel):
    """单个场景的渲染配置"""
    layoutId: str = "hero-center"
    motionMap: dict[str, str] = Field(default_factory=dict)
    content: dict[str, Any] = Field(default_factory=dict)
    durationSeconds: Optional[float] = None
    transitionIn: Optional[TransitionConfig] = None
    transitionOut: Optional[TransitionConfig] = None


class MatchingInput(BaseModel):
    """matching.ts 的输入模型"""
    title: str = ""
    url: str = ""
    tagline: str = ""
    points: list[str] = Field(default_factory=list)
    summary: str = ""
    stats: str = ""
    language: str = ""
    topics: list[str] = Field(default_factory=list)
    extractedVideos: Optional[list[str]] = None
    assets: Optional[list[dict]] = None


class AssetInfo(BaseModel):
    """素材信息"""
    type: str = ""
    path: str = ""
    duration: float = 0.0
    speed: float = 1.0


class AudioConfig(BaseModel):
    """渲染的音频配置"""
    sfxEnabled: bool = True
    voiceoverEnabled: bool = False
    voiceover: list[dict] = Field(default_factory=list)
    bgm: Optional[dict] = None


class VideoConfig(BaseModel):
    """VideoConfig 顶层 Pydantic 模型 — 对应 Zod schema 的 VideoConfig"""
    structureId: str = "funnel"
    styleId: str = "dark-purple"
    bgType: str = "starfield"
    sceneConfigs: dict[str, SceneConfig] = Field(default_factory=dict)
    audio: AudioConfig = Field(default_factory=AudioConfig)
    generated_by: Optional[dict] = None

    @classmethod
    def validate_json_file(cls, path: str) -> "VideoConfig":
        """从 JSON 文件加载并验证。"""
        import json
        with open(path, "r", encoding="utf-8") as f:
            return cls.model_validate(json.load(f))
