"""Omnivoice TTS — calls local Omnivoice backend (localhost:3900) or binary fallback."""

import asyncio
import logging
import os
import subprocess
import tempfile
from typing import Optional

from ....domain.post_producer.interfaces import VoiceoverGenerator

logger = logging.getLogger(__name__)


class OmnivoiceTTSVoiceoverGenerator(VoiceoverGenerator):
    """TTS via Omnivoice local backend (REST API) with binary fallback."""

    def __init__(self, base_url: str = "http://localhost:3900"):
        self.base_url = base_url
        self._bin_path = self._find_binary()

    async def generate_voiceover(
        self,
        text: str,
        output_path: str,
        voice_id: str = "default",
        style: Optional[str] = None,
    ) -> str:
        if not text:
            raise ValueError("text is required for TTS")

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        # Try REST API first
        try:
            import httpx
            async with httpx.AsyncClient(base_url=self.base_url, timeout=120) as client:
                form = {"text": text, "speed": "1.0", "language": "Auto"}
                if voice_id and voice_id != "default":
                    form["profile_id"] = voice_id
                r = await client.post("/generate", data=form)
                r.raise_for_status()
                with open(output_path, "wb") as f:
                    f.write(r.content)
        except Exception as api_err:
            logger.debug("[Omnivoice] REST API failed: %s, trying binary", api_err)
            if not self._bin_path:
                raise RuntimeError(
                    f"Omnivoice backend unavailable ({api_err}) and no binary found"
                )
            await self._call_binary(text, output_path)

        if not os.path.isfile(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError(f"Omnivoice produced empty output: {output_path}")

        logger.info("[OmnivoiceTTS] Generated %s", output_path)
        return output_path

    async def _call_binary(self, text: str, output_path: str) -> None:
        proc = await asyncio.create_subprocess_exec(
            self._bin_path,
            "--text", text,
            "--output", output_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        if proc.returncode != 0:
            raise RuntimeError(
                f"omnivoice-tts binary exited {proc.returncode}: {stderr.decode().strip()}"
            )

    @staticmethod
    def _find_binary() -> Optional[str]:
        candidates = [
            os.path.expanduser("~/proj/OmniVoice-Studio/bin/omnivoice-tts-linux-x86_64"),
            "omnivoice-tts",
        ]
        for c in candidates:
            if c and os.path.isfile(c) and os.access(c, os.X_OK):
                return c
        return None
