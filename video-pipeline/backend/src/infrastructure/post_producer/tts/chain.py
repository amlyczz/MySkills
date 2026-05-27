"""TTSChain — tries multiple TTS providers in order, auto-fallback on failure."""

import logging
from typing import Optional

from ....domain.post_producer.interfaces import VoiceoverGenerator

logger = logging.getLogger(__name__)


class TTSChain(VoiceoverGenerator):
    """Composite TTS provider that tries each provider in order.

    First successful result wins. If a provider raises an exception,
    logs a warning and tries the next one. Raises RuntimeError only
    if ALL providers fail.
    """

    def __init__(self, providers: list[VoiceoverGenerator]):
        self.providers = providers

    async def generate_voiceover(
        self,
        text: str,
        output_path: str,
        voice_id: str = "default",
        style: Optional[str] = None,
    ) -> str:
        if not self.providers:
            raise RuntimeError("TTSChain has no providers configured")

        last_error: Exception | None = None
        for provider in self.providers:
            name = type(provider).__name__
            try:
                result = await provider.generate_voiceover(text, output_path, voice_id, style)
                return result
            except Exception as e:
                logger.warning("TTS %s failed: %s, trying next provider", name, e)
                last_error = e

        raise RuntimeError(
            f"All {len(self.providers)} TTS providers failed. Last error: {last_error}"
        )
