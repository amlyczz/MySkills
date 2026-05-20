"""Media generation providers."""

from .base import BaseProvider, GenerationResult, ErrorInfo, GenerationMetadata, UnsupportedCapabilityError
from .minimax import MiniMaxProvider

__all__ = [
    "BaseProvider", "GenerationResult", "ErrorInfo", "GenerationMetadata",
    "UnsupportedCapabilityError", "MiniMaxProvider",
]
