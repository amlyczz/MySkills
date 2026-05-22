"""Media generation capability types."""

from .requests import (
    ImageRequest, SpeechRequest, MusicRequest, InstrumentalRequest,
    VideoRequest, ImageToVideoRequest, SpecializedTextRequest,
)
from .results import (
    ImageResult, ImageData, SpeechResult, VoiceInfo,
    MusicResult, VideoResult, SpecializedTextResult,
)

__all__ = [
    "ImageRequest", "ImageResult", "ImageData",
    "SpeechRequest", "SpeechResult", "VoiceInfo",
    "MusicRequest", "InstrumentalRequest", "MusicResult",
    "VideoRequest", "ImageToVideoRequest", "VideoResult",
    "SpecializedTextRequest", "SpecializedTextResult",
]
