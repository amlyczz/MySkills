"""Base classes and types for media generation providers."""

from abc import ABC, abstractmethod
from typing import Optional, Any

from pydantic import BaseModel, Field


class UnsupportedCapabilityError(Exception):
    """Raised when a provider does not support the requested capability."""

    def __init__(self, provider: str, capability: str):
        self.provider = provider
        self.capability = capability
        super().__init__(f"Provider '{provider}' does not support capability '{capability}'")


class ErrorInfo(BaseModel):
    """Structured error from a generation attempt."""
    code: str
    message: str
    provider: str = ""


class GenerationMetadata(BaseModel):
    """Metadata about a generation attempt."""
    provider: str = ""
    model: str = ""
    duration_ms: float = 0.0

    model_config = {"extra": "allow"}


class GenerationResult(BaseModel):
    """Unified result from any media generation call.

    success=True  → data is populated
    success=False → error is populated, data may be None
    """

    success: bool
    data: Optional[Any] = None
    error: Optional[ErrorInfo] = None
    metadata: GenerationMetadata = Field(default_factory=GenerationMetadata)

    @classmethod
    def ok(cls, data: Any, provider: str = "", model: str = "",
           duration_ms: float = 0, **extra_meta) -> "GenerationResult":
        return cls(
            success=True,
            data=data,
            metadata=GenerationMetadata(
                provider=provider, model=model,
                duration_ms=duration_ms, **extra_meta,
            ),
        )

    @classmethod
    def fail(cls, code: str, message: str, provider: str = "",
             **extra_meta) -> "GenerationResult":
        return cls(
            success=False,
            error=ErrorInfo(code=code, message=message, provider=provider),
            metadata=GenerationMetadata(**extra_meta),
        )


class BaseProvider(ABC):
    """Abstract base for media generation providers.

    Each provider advertises the capabilities it supports via `supported_capabilities`.
    Calling generate() for an unsupported capability raises UnsupportedCapabilityError.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier (e.g. 'minimax', 'openai')."""
        ...

    @property
    @abstractmethod
    def supported_capabilities(self) -> list[str]:
        """List of capabilities this provider can handle.

        Valid capability names: 'image', 'speech', 'music', 'video'
        """
        ...
