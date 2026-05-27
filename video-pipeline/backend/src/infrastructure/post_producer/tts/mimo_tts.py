"""MiMo TTS — Xiaomi's speech synthesis via OpenAI-compatible API.

API docs: https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/speech-synthesis-v2.5
Key points:
  - OpenAI Chat Completions compatible endpoint
  - user message = style instruction, assistant message = text to synthesize
  - Response: choices[0].message.audio.data (base64 encoded WAV)
  - Voices: 苏打(male), 白桦(male), 冰糖(female), 茉莉(female)
"""

import asyncio
import base64
import logging
import os
import subprocess
from typing import Optional

from openai import OpenAI

from ....domain.post_producer.interfaces import VoiceoverGenerator

logger = logging.getLogger(__name__)

_MIMO_BASE_URL = "https://api.xiaomimimo.com/v1"


class MimoTTSVoiceoverGenerator(VoiceoverGenerator):
    """TTS via Xiaomi MiMo API — primary provider with strong Chinese style control."""

    def __init__(self, api_key: str, voice: str = "苏打"):
        self.client = OpenAI(
            api_key=api_key,
            base_url=_MIMO_BASE_URL,
            default_headers={"api-key": api_key},  # MiMo uses api-key header, not Bearer
        )
        self.voice = voice

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

        style_instruction = style or "用沉稳专业的男声朗读以下内容，语速适中，吐字清晰。"

        wav_path = output_path
        need_convert = output_path.lower().endswith(".mp3")
        if need_convert:
            wav_path = output_path.rsplit(".", 1)[0] + ".wav"

        # OpenAI SDK is sync — wrap in to_thread
        audio_b64 = await asyncio.to_thread(self._call_api, text, style_instruction)

        audio_bytes = base64.b64decode(audio_b64)
        with open(wav_path, "wb") as f:
            f.write(audio_bytes)

        logger.info(
            "[MimoTTS] Generated %s (%d bytes, voice=%s)",
            wav_path, len(audio_bytes), self.voice,
        )

        if need_convert:
            await self._wav_to_mp3(wav_path, output_path)
            os.remove(wav_path)

        return output_path

    def _call_api(self, text: str, style_instruction: str) -> str:
        """Synchronous API call — run in to_thread."""
        response = self.client.chat.completions.create(
            model="mimo-v2.5-tts",
            messages=[
                {"role": "user", "content": style_instruction},
                {"role": "assistant", "content": text},
            ],
            audio={"format": "wav", "voice": self.voice},
        )
        audio_data = response.choices[0].message.audio
        if not audio_data or not audio_data.data:
            raise RuntimeError("MiMo TTS returned no audio data")
        return audio_data.data

    @staticmethod
    async def _wav_to_mp3(wav_path: str, mp3_path: str) -> None:
        """Convert WAV to MP3 via ffmpeg."""
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-i", wav_path,
            "-codec:a", "libmp3lame", "-qscale:a", "2",
            mp3_path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg wav→mp3 failed: {stderr.decode()[:200]}")
