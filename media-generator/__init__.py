"""MediaGeneration — unified media generation for the video pipeline.

Usage:
    from media_generator import MediaGenerator

    media = MediaGenerator()
    result = await media.generate("cover_image", prompt="...", aspect_ratio="3:4")
    result = await media.generate("voiceover", text="...", voice_id="male-tech-01")
    result = await media.generate("bgm", prompt="ambient", instrumental=True)
"""

from .media_generator import MediaGenerator
from .providers.base import GenerationResult

__all__ = ["MediaGenerator", "GenerationResult"]
