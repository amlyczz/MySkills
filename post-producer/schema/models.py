"""
post-producer Pydantic 模型 — 音频混音 + 字幕烧录的输入约束。

为 audio_mixer.py 的输入（timeline.json + audio config）提供 Pydantic 类型校验。
"""

from pydantic import BaseModel, Field
from typing import Optional


class RepoRef(BaseModel):
    """仓库引用"""
    full_name: str
    url: str


class GlobalTimelineConfig(BaseModel):
    """全局时间线配置"""
    title: str = ""
    total_duration: float = Field(default=180, ge=0)
    resolution: tuple[int, int] = (1920, 1080)
    fps: int = 30
    bgm_track: str = "bgm_ambient_tech"
    bgm_volume: float = Field(default=0.2, ge=0, le=1)
    progress_bar_style: str = "labeled-bar"


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


class SegmentAudio(BaseModel):
    """段落音频配置"""
    bgm_volume: Optional[float] = Field(None, ge=0, le=1)
    bgm_fade_in: Optional[float] = None
    bgm_fade_out: Optional[float] = None
    sfx: list[SfxEntry] = Field(default_factory=list)


class LayoutConfig(BaseModel):
    """段落布局配置"""
    layout_id: str = "hero-center"
    motion_map: dict[str, str] = Field(default_factory=dict)


class TimelineSegment(BaseModel):
    """时间线段落"""
    id: str = ""
    type: str = "showcase"
    label: str = ""
    time_start: float = 0.0
    time_end: float = 0.0
    duration: float = 0.0
    voiceover: VoiceoverSegment = Field(default_factory=VoiceoverSegment)
    primary_material: Optional[str] = None
    material_refs: list[str] = Field(default_factory=list)
    layout: LayoutConfig = Field(default_factory=LayoutConfig)
    audio: SegmentAudio = Field(default_factory=SegmentAudio)
    transition_in: str = "crossfade"
    transition_out: str = "crossfade"


class ChapterMarker(BaseModel):
    """章节标记"""
    label: str
    time: float = 0.0


class SubtitleEntry(BaseModel):
    """字幕条目"""
    text: str
    time_start: float = 0.0
    time_end: float = 0.0


class TimelineModel(BaseModel):
    """timeline.json 顶层模型"""
    version: str = "2"
    repo: RepoRef = Field(default_factory=lambda: RepoRef(full_name="", url=""))
    global_: GlobalTimelineConfig = Field(default_factory=GlobalTimelineConfig, alias="global")
    segments: list[TimelineSegment] = Field(default_factory=list)
    chapters: list[ChapterMarker] = Field(default_factory=list)
    subtitles: list[SubtitleEntry] = Field(default_factory=list)

    model_config = {"populate_by_name": True}

    @classmethod
    def from_json(cls, path: str) -> "TimelineModel":
        """从 timeline.json 文件加载。"""
        import json
        with open(path, "r", encoding="utf-8") as f:
            return cls.model_validate(json.load(f))


class MixAudioRequest(BaseModel):
    """混音请求参数"""
    video_path: str
    voiceover_path: str = ""
    bgm_path: str = ""
    timeline_path: str
    output_path: str = "final.mp4"
    sfx_dir: Optional[str] = None
    bgm_offset: float = 0.5
    bgm_tail: float = 1.0
