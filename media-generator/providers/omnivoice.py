"""OmniVoice provider: HTTP-based TTS via local OmniVoice backend.

Calls the OmniVoice Studio REST API at localhost:3900.
Falls back gracefully if the backend is not running.
"""

import asyncio
import os
import time
import tempfile
import subprocess
from typing import Optional

from .base import BaseProvider, GenerationResult, UnsupportedCapabilityError
from ..capabilities.speech import SpeechRequest, SpeechResult


class OmniVoiceProvider(BaseProvider):
    """TTS generation via OmniVoice local backend.

    Uses the REST API at http://localhost:3900/generate (form POST).
    Falls back to omnivoice-tts binary if backend is unavailable.
    """

    def __init__(self):
        self._api_base = os.environ.get("OMNIVOICE_API_URL", "http://localhost:3900")
        self._bin_path = self._find_binary()

    @property
    def name(self) -> str:
        return "omnivoice"

    @property
    def supported_capabilities(self) -> list[str]:
        return ["speech"]

    async def generate(self, capability: str, **kwargs) -> GenerationResult:
        if capability not in self.supported_capabilities:
            raise UnsupportedCapabilityError(self.name, capability)
        return await self.generate_speech(**kwargs)

    async def generate_speech(
        self,
        request: Optional[SpeechRequest] = None,
        text: str = "",
        voice_id: str = "",
        speed: float = 1.0,
        pitch: int = 0,
        output: Optional[str] = None,
        **kwargs,
    ) -> GenerationResult:
        t0 = time.monotonic()
        if request is not None:
            text = request.text
            voice_id = request.voice_id
            speed = request.speed
            pitch = request.pitch
        if not text:
            return GenerationResult.fail("BAD_REQUEST", "text is required", self.name)

        output_path = output or self._temp_path(".wav")

        # Try REST API first
        try:
            import httpx
            async with httpx.AsyncClient(base_url=self._api_base, timeout=120) as client:
                form = {"text": text, "speed": str(speed), "language": "Auto"}
                if voice_id:
                    form["profile_id"] = voice_id
                r = await client.post("/generate", data=form)
                r.raise_for_status()
                with open(output_path, "wb") as f:
                    f.write(r.content)
        except (httpx.ConnectError, httpx.TimeoutException, Exception) as e:
            # Backend unavailable or error — try binary fallback
            if not self._bin_path:
                return GenerationResult.fail(
                    "BACKEND_UNAVAILABLE",
                    f"OmniVoice backend not running ({e}) and no binary found",
                    self.name,
                    duration_ms=(time.monotonic() - t0) * 1000,
                )
            try:
                proc = await asyncio.create_subprocess_exec(
                    self._bin_path,
                    "--text", text,
                    "--output", output_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
                if proc.returncode != 0:
                    raise RuntimeError(stderr.decode().strip() or f"exit {proc.returncode}")
            except Exception as bin_e:
                return GenerationResult.fail(
                    "SPEECH_FAILED",
                    f"OmniVoice binary failed: {bin_e}",
                    self.name,
                    duration_ms=(time.monotonic() - t0) * 1000,
                )

        # Validate output
        if not os.path.isfile(output_path) or os.path.getsize(output_path) == 0:
            return GenerationResult.fail(
                "EMPTY_OUTPUT", "Generated audio is empty", self.name,
                duration_ms=(time.monotonic() - t0) * 1000,
            )

        dur = self._probe_duration(output_path)
        return GenerationResult.ok(
            SpeechResult(audio_path=output_path, duration_seconds=dur),
            provider=self.name, model="omnivoice-3",
            duration_ms=(time.monotonic() - t0) * 1000,
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

    @staticmethod
    def _temp_path(suffix: str) -> str:
        fd, path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        return path

    @staticmethod
    def _probe_duration(path: str) -> float:
        if not os.path.exists(path):
            return 0.0
        res = subprocess.run([
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            path,
        ], capture_output=True, text=True, timeout=30)
        try:
            return float(res.stdout.strip())
        except ValueError:
            return 0.0
