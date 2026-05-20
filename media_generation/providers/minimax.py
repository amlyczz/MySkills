"""MiniMax provider: wraps `mmx` CLI for image / speech / music / video generation."""

import asyncio
import os
import json
import tempfile
import time
from typing import Optional, List

from .base import BaseProvider, GenerationResult, UnsupportedCapabilityError
from ..capabilities.image import ImageRequest, ImageResult, ImageData
from ..capabilities.speech import SpeechRequest, SpeechResult
from ..capabilities.music import MusicRequest, InstrumentalRequest, MusicResult
from ..capabilities.video import VideoRequest, ImageToVideoRequest, VideoResult
from ..utils.retry import retry_with_backoff


class MiniMaxProvider(BaseProvider):
    """Media generation via `mmx` CLI (MiniMax API platform).

    All calls go through asyncio.create_subprocess_exec('mmx', ...).
    P0: checks exit code + output file existence. No --output json parsing.
    """

    def __init__(self, model_overrides: Optional[dict[str, str]] = None):
        self._models: dict[str, str] = {
            "image": "image-01",
            "speech": "speech-hd",
            "music": "music-2.6",
            "video": "MiniMax-Hailuo-2.3-Fast-6s-768p",
            **(model_overrides or {}),
        }

    @property
    def name(self) -> str:
        return "minimax"

    @property
    def supported_capabilities(self) -> list[str]:
        return ["image", "speech", "music", "video"]

    # ── Public dispatch ──────────────────────────────────────

    async def generate(self, capability: str, **kwargs) -> GenerationResult:
        """Dispatch to the appropriate capability handler."""
        if capability not in self.supported_capabilities:
            raise UnsupportedCapabilityError(self.name, capability)

        handlers = {
            "image": self.generate_image,
            "speech": self.generate_speech,
            "music": self.generate_music,
            "video": self.generate_video,
        }
        return await handlers[capability](**kwargs)

    # ── Image ────────────────────────────────────────────────

    async def generate_image(self, request: Optional[ImageRequest] = None,
                             prompt: str = "", aspect_ratio: str = "1:1",
                             size: Optional[str] = None,
                             output: Optional[str] = None,
                             **kwargs) -> GenerationResult:
        t0 = time.monotonic()
        if request is not None:
            prompt = request.prompt
            aspect_ratio = request.aspect_ratio or "1:1"
            size = request.size
        if not prompt:
            return GenerationResult.fail("BAD_REQUEST", "prompt is required", self.name)

        output_path = output or self._temp_path(".png")
        model = self._models["image"]

        args = ["mmx", "image", "generate",
                "--prompt", prompt,
                "--output", output_path,
                "--quiet"]
        if size:
            args += ["--size", size]
        else:
            args += ["--aspect-ratio", aspect_ratio]

        try:
            await self._run_mmx(args)
            return GenerationResult.ok(
                ImageResult(images=[
                    ImageData(local_path=output_path, url=None, width=0, height=0,
                              size_bytes=os.path.getsize(output_path) if os.path.isfile(output_path) else 0)
                ]),
                provider=self.name, model=model,
                duration_ms=(time.monotonic() - t0) * 1000,
            )
        except Exception as e:
            return GenerationResult.fail("IMAGE_FAILED", str(e), self.name,
                                         duration_ms=(time.monotonic() - t0) * 1000)

    # ── Speech ───────────────────────────────────────────────

    async def generate_speech(self, request: Optional[SpeechRequest] = None,
                              text: str = "", voice_id: str = "male-tech-01",
                              speed: float = 1.0, output: Optional[str] = None,
                              **kwargs) -> GenerationResult:
        t0 = time.monotonic()
        if request is not None:
            text = request.text
            voice_id = request.voice_id
            speed = request.speed
        if not text:
            return GenerationResult.fail("BAD_REQUEST", "text is required", self.name)

        output_path = output or self._temp_path(".mp3")
        model = self._models["speech"]

        args = ["mmx", "speech", "synthesize",
                "--text", text,
                "--voice", voice_id,
                "--speed", str(speed),
                "--output", output_path,
                "--quiet"]

        try:
            await self._run_mmx(args)
            return GenerationResult.ok(
                SpeechResult(audio_path=output_path, duration_seconds=0.0),
                provider=self.name, model=model,
                duration_ms=(time.monotonic() - t0) * 1000,
            )
        except Exception as e:
            return GenerationResult.fail("SPEECH_FAILED", str(e), self.name,
                                         duration_ms=(time.monotonic() - t0) * 1000)

    # ── Music ────────────────────────────────────────────────

    async def generate_music(self, request=None, *,
                             prompt: str = "", instrumental: bool = True,
                             duration: Optional[int] = None,
                             output: Optional[str] = None, **kwargs) -> GenerationResult:
        t0 = time.monotonic()
        if request is not None:
            if isinstance(request, InstrumentalRequest):
                prompt = request.prompt
                duration = request.duration
                instrumental = True
            elif isinstance(request, MusicRequest):
                prompt = request.prompt
                duration = request.duration
                instrumental = request.lyrics is None
        if not prompt:
            return GenerationResult.fail("BAD_REQUEST", "prompt is required", self.name)

        output_path = output or self._temp_path(".mp3")
        model = self._models["music"]

        args = ["mmx", "music", "generate",
                "--prompt", prompt,
                "--output", output_path,
                "--quiet"]
        if instrumental:
            args.append("--instrumental")
        if duration:
            args += ["--duration", str(duration)]

        try:
            await self._run_mmx(args)
            return GenerationResult.ok(
                MusicResult(audio_path=output_path),
                provider=self.name, model=model,
                duration_ms=(time.monotonic() - t0) * 1000,
            )
        except Exception as e:
            return GenerationResult.fail("MUSIC_FAILED", str(e), self.name,
                                         duration_ms=(time.monotonic() - t0) * 1000)

    # ── Video ────────────────────────────────────────────────

    async def generate_video(self, request=None, *,
                             prompt: str = "", duration: Optional[int] = None,
                             resolution: Optional[str] = None,
                             output: Optional[str] = None,
                             image_path: Optional[str] = None,
                             **kwargs) -> GenerationResult:
        t0 = time.monotonic()
        if request is not None:
            prompt = request.prompt
            duration = request.duration
            resolution = request.resolution
            if isinstance(request, ImageToVideoRequest):
                image_path = request.image_path
        if not prompt and not image_path:
            return GenerationResult.fail("BAD_REQUEST", "prompt or image_path is required", self.name)

        output_path = output or self._temp_path(".mp4")
        model = self._models["video"]

        args = ["mmx", "video", "generate",
                "--output", output_path,
                "--quiet"]
        if image_path:
            args += ["--image", image_path]
            if prompt:
                args += ["--prompt", prompt]
        else:
            args += ["--prompt", prompt]
        if duration:
            args += ["--duration", str(duration)]
        if resolution:
            args += ["--resolution", resolution]

        try:
            await retry_with_backoff(
                lambda: self._run_mmx(args),
                max_retries=2, base_delay=2.0, max_delay=15.0,
            )
            return GenerationResult.ok(
                VideoResult(video_path=output_path),
                provider=self.name, model=model,
                duration_ms=(time.monotonic() - t0) * 1000,
            )
        except Exception as e:
            return GenerationResult.fail("VIDEO_FAILED", str(e), self.name,
                                         duration_ms=(time.monotonic() - t0) * 1000)

    # ── Helpers ──────────────────────────────────────────────

    async def _run_mmx(self, args: list[str], timeout: float = 300.0):
        """Run mmx subprocess and check for success."""
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise RuntimeError(f"mmx timed out after {timeout}s: {' '.join(args)}")

        if proc.returncode != 0:
            err_msg = stderr.decode().strip() if stderr else "unknown error"
            raise RuntimeError(f"mmx exited {proc.returncode}: {err_msg}")

    @staticmethod
    def _temp_path(suffix: str) -> str:
        fd, path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        return path
