"""Shared prompt templates for specialized text generation.

Used by both MiniMaxProvider and DeepSeekProvider.
Avoids ~30 lines of duplicated dict definitions.
"""

from typing import Optional


def build_specialized_prompt(
    format: str,
    theme: str,
    style: Optional[str] = None,
    length: str = "medium",
    rhyme_scheme: Optional[str] = None,
) -> tuple[str, str]:
    """Return (system_prompt, user_prompt) for a given text format.

    Formats:
        classical_poem — 四言诗
        lyrics         — 歌词
        couplet        — 对联
        other          — 通用创作
    """
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

    system = prompts.get(format, prompts["other"])
    user = f"主题：{theme}"
    return system, user
