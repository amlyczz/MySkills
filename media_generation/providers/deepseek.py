"""DeepSeek provider: OpenAI-compatible HTTP API for specialized text generation.

Used as an alternative to MiniMax for creative text formats.
API: POST https://api.deepseek.com/v1/chat/completions
Auth: Bearer $DEEPSEEK_API_KEY
"""

import asyncio
import os
import json
import time
from typing import Optional

from .base import BaseProvider, GenerationResult, UnsupportedCapabilityError
from ..capabilities.text import SpecializedTextRequest, SpecializedTextResult


DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"


class DeepSeekProvider(BaseProvider):
    """Specialized text generation via DeepSeek API."""

    def __init__(self, model: str = "deepseek-chat", api_key: Optional[str] = None):
        self._model = model
        self._api_key = api_key or os.environ.get("DEEPSEEK_API_KEY", "")

    @property
    def name(self) -> str:
        return "deepseek"

    @property
    def supported_capabilities(self) -> list[str]:
        return ["specialized_text"]

    async def generate(self, capability: str, **kwargs) -> GenerationResult:
        if capability not in self.supported_capabilities:
            raise UnsupportedCapabilityError(self.name, capability)
        return await self.generate_specialized_text(**kwargs)

    async def generate_specialized_text(self,
                                        request: Optional[SpecializedTextRequest] = None,
                                        format: str = "other",
                                        theme: str = "",
                                        style: Optional[str] = None,
                                        length: str = "medium",
                                        rhyme_scheme: Optional[str] = None,
                                        **kwargs) -> GenerationResult:
        t0 = time.monotonic()

        if request is not None:
            format = request.format
            theme = request.theme
            style = request.style
            length = request.length
            rhyme_scheme = request.rhyme_scheme

        if not theme:
            return GenerationResult.fail("BAD_REQUEST", "theme is required", self.name)

        if not self._api_key:
            return GenerationResult.fail("NO_API_KEY", "DEEPSEEK_API_KEY not set", self.name)

        prompts = {
            "classical_poem": (
                f"你是一位古典诗人。请根据主题创作一首四言诗。{style or '风格优雅简练'}。"
                f"长度：{length}。只输出诗作，不加解释。"
            ),
            "lyrics": (
                f"你是一位作词人。请根据主题创作歌词。{style or '押韵工整'}。"
                f"长度：{length}。{f'押韵方案：{rhyme_scheme}。' if rhyme_scheme else ''}"
                f"只输出歌词，不加解释。"
            ),
            "couplet": (
                f"你是一位对联大师。请根据主题创作一副对联。{style or '对仗工整'}。"
                f"只输出对联，不加解释。"
            ),
            "other": f"请根据以下主题进行创作：{theme}。{style or ''} 只输出内容，不加解释。",
        }

        system_prompt = prompts.get(format, prompts["other"])
        body = json.dumps({
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"主题：{theme}"},
            ],
            "temperature": 0.8,
            "max_tokens": 1024,
        })

        try:
            proc = await asyncio.create_subprocess_exec(
                "curl", "-sS",
                "-H", f"Authorization: Bearer {self._api_key}",
                "-H", "Content-Type: application/json",
                "-d", body,
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                "--connect-timeout", "30",
                "--max-time", "120",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120.0)

            if proc.returncode != 0:
                err = stderr.decode().strip() if stderr else "unknown error"
                return GenerationResult.fail("API_ERROR", err, self.name,
                                             duration_ms=(time.monotonic() - t0) * 1000)

            response = json.loads(stdout.decode())
            if "error" in response:
                return GenerationResult.fail("API_ERROR",
                                             str(response["error"].get("message", response["error"])),
                                             self.name,
                                             duration_ms=(time.monotonic() - t0) * 1000)

            content = response["choices"][0]["message"]["content"].strip()
            return GenerationResult.ok(
                SpecializedTextResult(content=content, format=format),
                provider=self.name, model=response.get("model", self._model),
                duration_ms=(time.monotonic() - t0) * 1000,
                usage=response.get("usage", {}),
            )

        except asyncio.TimeoutError:
            return GenerationResult.fail("TIMEOUT", "DeepSeek API timed out", self.name,
                                         duration_ms=(time.monotonic() - t0) * 1000)
        except json.JSONDecodeError:
            return GenerationResult.fail("PARSE_ERROR", "invalid JSON response", self.name,
                                         duration_ms=(time.monotonic() - t0) * 1000)
        except Exception as e:
            return GenerationResult.fail("PROVIDER_ERROR", str(e), self.name,
                                         duration_ms=(time.monotonic() - t0) * 1000)
