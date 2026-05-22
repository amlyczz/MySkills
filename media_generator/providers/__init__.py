"""Media generation providers."""

from .base import BaseProvider, GenerationResult, ErrorInfo, GenerationMetadata, UnsupportedCapabilityError
from .minimax import MiniMaxProvider
from .deepseek import DeepSeekProvider

__all__ = [
    "BaseProvider", "GenerationResult", "ErrorInfo", "GenerationMetadata",
    "UnsupportedCapabilityError", "MiniMaxProvider", "DeepSeekProvider",
]
