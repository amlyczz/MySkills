"""MiniMax TTS — calls mmx CLI for speech-hd synthesis."""

import asyncio
import logging
import os
from typing import Optional

from ....domain.post_producer.interfaces import VoiceoverGenerator

logger = logging.getLogger(__name__)


class MinimaxTTSVoiceoverGenerator(VoiceoverGenerator):
    """TTS via MiniMax mmx CLI (speech-hd)."""

    async def generate_voiceover(
        self,
        text: str,
        output_path: str,
        voice_id: str = "male-qn-jingying",
        style: Optional[str] = None,
    ) -> str:
        if not text:
            raise ValueError("text is required for TTS")

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        args = [
            "mmx", "speech", "synthesize",
            "--text", text,
            "--voice", voice_id,
            "--speed", "1.0",
            "--out", output_path,
            "--quiet",
        ]

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise RuntimeError("mmx speech synthesize timed out after 120s")

        if proc.returncode != 0:
            err = stderr.decode().strip() if stderr else "unknown error"
            raise RuntimeError(f"mmx speech synthesize exited {proc.returncode}: {err}")

        if not os.path.isfile(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError(f"mmx produced no output: {output_path}")

        logger.info("[MiniMaxTTS] Generated %s", output_path)
        return output_path
