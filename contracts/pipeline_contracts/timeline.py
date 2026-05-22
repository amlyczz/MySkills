"""
TimelineModel — 时间线编排的数据契约。

从 timeline-composer/scripts/timeline_composer.py 的内联模型 + post-producer/schema/models.py 合并而来。
"""

from pydantic import BaseModel, Field
from typing import Optional
from pipeline_contracts.audio import VoiceoverSegment, AudioConfig


class LayoutConfig(BaseModel):
    """段落布局配置"""
    layout_id: str = "hero-center"
    motion_map: dict[str, str] = Field(default_factory=dict)


class StyleConfig(BaseModel):
    """段落视觉风格"""
    theme_id: str = "dark-purple"
    bg_type: str = "starfield"


class CodeTemplate(BaseModel):
    """代码渲染配置（用于 code_showcase / source_highlight）"""
    language: str = ""
    highlight_lines: list[int] = Field(default_factory=list)
    animation: str = "fade"
    show_line_numbers: bool = False
    max_visible_lines: Optional[int] = None


class GlobalTimelineConfig(BaseModel):
    """全局时间线配置"""
    title: str = ""
    total_duration: float = Field(default=180, ge=0)
    resolution: tuple[int, int] = (1920, 1080)
    fps: int = 30
    bgm_track: str = "bgm_ambient_tech"
    bgm_volume: float = Field(default=0.2, ge=0, le=1)
    progress_bar_style: str = "labeled-bar"


class ChapterMarker(BaseModel):
    """章节标记"""
    label: str
    time: float = 0.0


class SubtitleEntry(BaseModel):
    """字幕条目"""
    text: str
    time_start: float = 0.0
    time_end: float = 0.0


class TimelineSegment(BaseModel):
    """时间线段落"""
    model_config = {"frozen": False}

    id: str = ""
    type: str = ""
    label: str = ""
    time_start: float = 0.0
    time_end: float = 0.0
    duration: float = 0.0
    voiceover: VoiceoverSegment = Field(default_factory=VoiceoverSegment)
    primary_material: Optional[str] = None
    material_refs: list[str] = Field(default_factory=list)
    material_time_range: Optional[dict[str, float]] = None
    code_template: Optional[CodeTemplate] = None
    layout: LayoutConfig = Field(default_factory=LayoutConfig)
    style: StyleConfig = Field(default_factory=StyleConfig)
    audio: AudioConfig = Field(default_factory=AudioConfig)
    transition_in: str = "crossfade"
    transition_out: str = "crossfade"


class TimelineModel(BaseModel):
    """timeline.json 顶层模型"""
    version: str = "2"
    repo: Optional[dict] = None
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

    def to_json(self) -> dict:
        """序列化为可 JSON 序列化的 dict。"""
        return self.model_dump(by_alias=True, exclude_none=True)


class MixAudioRequest(BaseModel):
    """混音请求参数（从 post-producer/schema/models.py 迁移）"""
    video_path: str
    voiceover_path: str = ""
    bgm_path: str = ""
    timeline_path: str
    output_path: str = "final.mp4"
    sfx_dir: Optional[str] = None
    bgm_offset: float = 0.5
    bgm_tail: float = 1.0
