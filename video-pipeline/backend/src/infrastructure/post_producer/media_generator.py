import asyncio
import logging
import os
import subprocess
import sys
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator

logger = logging.getLogger(__name__)

class MediaGenerator(VoiceoverGenerator, BGMGenerator):
    """Legacy subprocess-based media generation — kept for BGM and as TTS fallback reference."""

    async def generate_voiceover(self, text: str, output_path: str, voice_id: str = "default", style=None) -> str:
        cmd = [
            sys.executable, "-m", "media_generator", "voiceover",
            "--text", text,
            "--voice-id", voice_id,
            "-o", output_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            raise RuntimeError(
                f"media_generator voiceover failed (exit {process.returncode}): {stderr.decode()[:300]}"
            )

        return output_path

    async def generate_bgm(self, prompt: str, duration: int, output_path: str) -> str:
        cmd = [
            sys.executable, "-m", "media_generator", "bgm",
            "--prompt", prompt,
            "--duration", str(duration),
            "-o", output_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            raise RuntimeError(
                f"media_generator bgm failed (exit {process.returncode}): {stderr.decode()[:300]}"
            )

        return output_path
