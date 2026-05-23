"""
pipeline-contracts — 通用 Pipeline Processor 数据契约。

所有 Processor 之间的数据交换协议都定义在此包中：
  - ContentModel: 内容分析与口播脚本
  - MaterialManifest: 素材采集清单
  - TimelineModel: 时间线编排
  - VideoConfig: 渲染配置
  - 枚举常量（跨语言共享）
  - 通用工具

使用方式：
    from pipeline_contracts import ContentModel, MaterialManifest, TimelineModel
"""

from pipeline_contracts.content import (
    ContentModel,
    NormalizedContent,
    AnySourceMeta,
    Script,
    ScriptSegment,
    Covers,
    CoverVariant,
    PublishCopy,
    PublishTitle,
    SourceCodeInsight,
    Meta,
)

from pipeline_contracts.material import (
    MaterialManifest,
    Material,
    MaterialSource,
    CaptureInfo,
    MaterialMetadata,
    RepoRef,
)

from pipeline_contracts.timeline import (
    TimelineModel,
    TimelineSegment,
    ChapterMarker,
    SubtitleEntry,
    GlobalTimelineConfig,
    LayoutConfig,
    CodeTemplate,
    StyleConfig,
    MixAudioRequest,
)

from pipeline_contracts.audio import (
    VoiceoverSegment,
    VoiceoverSplit,
    SfxEntry,
    AudioConfig,
    SegmentAudio,
)

from pipeline_contracts.video_config import (
    VideoConfig,
    SceneConfig,
    TransitionConfig,
    MatchingInput,
    AssetInfo,
)

from pipeline_contracts.utils import (
    probe_media,
    get_duration,
    get_resolution,
)

__all__ = [
    # content
    "ContentModel", "NormalizedContent", "AnySourceMeta", "Script", "ScriptSegment",
    "Covers", "CoverVariant", "PublishCopy", "PublishTitle",
    "SourceCodeInsight", "Meta",
    # material
    "MaterialManifest", "Material", "MaterialSource", "CaptureInfo",
    "MaterialMetadata", "RepoRef",
    # timeline
    "TimelineModel", "TimelineSegment", "ChapterMarker", "SubtitleEntry",
    "GlobalTimelineConfig", "LayoutConfig", "CodeTemplate", "StyleConfig",
    "MixAudioRequest",
    # audio
    "VoiceoverSegment", "VoiceoverSplit", "SfxEntry", "AudioConfig", "SegmentAudio",
    # video_config
    "VideoConfig", "SceneConfig", "TransitionConfig", "MatchingInput", "AssetInfo",
    # utils
    "probe_media", "get_duration", "get_resolution",
]
