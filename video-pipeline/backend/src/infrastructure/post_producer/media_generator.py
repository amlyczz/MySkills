import asyncio
import logging
import shutil
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator

logger = logging.getLogger(__name__)


class MediaGenerator(VoiceoverGenerator, BGMGenerator):
    """BGM generation via MiniMax mmx CLI. Voiceover uses dedicated TTS providers."""

    def __init__(self) -> None:
        self._mmx = shutil.which("mmx")
        if not self._mmx:
            logger.warning("mmx CLI not found in PATH; BGM generation will be skipped")

    async def generate_voiceover(self, text: str, output_path: str, voice_id: str = "default", style=None) -> str:
        raise NotImplementedError("Use dedicated TTS providers (MimoTTS, MinimaxTTS) for voiceover")

    async def generate_bgm(self, prompt: str, duration: int, output_path: str) -> str:
        if not self._mmx:
            raise RuntimeError("mmx CLI not found — install with: npm install -g mmx-cli")

        cmd = [
            self._mmx, "music", "generate",
            "--prompt", prompt,
            "--instrumental",
            "--mood", "atmospheric",
            "--instruments", "synth pads, soft piano, electronic textures",
            "--out", output_path,
            "--quiet", "--non-interactive",
        ]

        logger.info("[BGM] Generating instrumental track via mmx (prompt=%s, duration=%ds)", prompt[:60], duration)

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)

        if proc.returncode != 0:
            raise RuntimeError(
                f"mmx music generate failed (exit {proc.returncode}): {stderr.decode()[:300]}"
            )

        logger.info("[BGM] Generated %s", output_path)
        return output_path
