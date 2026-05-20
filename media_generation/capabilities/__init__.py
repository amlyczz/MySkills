"""Media generation capability types."""

from .image import ImageRequest, ImageResult, ImageData
from .speech import SpeechRequest, SpeechResult, VoiceInfo
from .music import MusicRequest, InstrumentalRequest, MusicResult
from .video import VideoRequest, ImageToVideoRequest, VideoResult

__all__ = [
    "ImageRequest", "ImageResult", "ImageData",
    "SpeechRequest", "SpeechResult", "VoiceInfo",
    "MusicRequest", "InstrumentalRequest", "MusicResult",
    "VideoRequest", "ImageToVideoRequest", "VideoResult",
]
