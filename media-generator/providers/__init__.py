"""Media generation providers."""

from .base import BaseProvider, GenerationResult, ErrorInfo, GenerationMetadata, UnsupportedCapabilityError
from .minimax import MiniMaxProvider
from .deepseek import DeepSeekProvider
from .omnivoice import OmniVoiceProvider

__all__ = [
    "BaseProvider", "GenerationResult", "ErrorInfo", "GenerationMetadata",
    "UnsupportedCapabilityError", "MiniMaxProvider", "DeepSeekProvider",
    "OmniVoiceProvider",
]
