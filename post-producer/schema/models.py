"""
post-producer Pydantic 模型 — 仅作为 import 重定向。

所有模型定义已迁移到 pipeline-contracts 包。
保留此文件保持向后兼容。
"""
# flake8: noqa
from pipeline_contracts import (
    TimelineModel,
    TimelineSegment,
    ChapterMarker,
    SubtitleEntry,
    GlobalTimelineConfig,
    LayoutConfig,
    MixAudioRequest,
    RepoRef,
)
from pipeline_contracts.audio import (
    VoiceoverSegment,
    VoiceoverSplit,
    SfxEntry,
    SegmentAudio,
)

__all__ = [
    "TimelineModel", "TimelineSegment", "ChapterMarker", "SubtitleEntry",
    "GlobalTimelineConfig", "LayoutConfig", "RepoRef",
    "VoiceoverSegment", "VoiceoverSplit", "SfxEntry", "SegmentAudio",
    "MixAudioRequest",
]
