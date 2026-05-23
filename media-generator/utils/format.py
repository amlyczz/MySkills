"""Format conversion utilities for media files.

Converts between common audio/image formats using ffmpeg (audio/video)
and Python stdlib or sips (macOS builtin) for images.
"""

import os
import asyncio
import platform
from typing import Optional


async def wav_to_mp3(input_path: str, output_path: Optional[str] = None,
                     bitrate: str = "192k") -> str:
    """Convert WAV audio to MP3 using ffmpeg.

    Args:
        input_path: Path to source WAV file.
        output_path: Destination MP3 path. If None, derives from input name.
        bitrate: Audio bitrate (e.g. '128k', '192k', '320k').

    Returns:
        Absolute path to the output MP3 file.

    Raises:
        RuntimeError: If ffmpeg exits non-zero.
    """
    if output_path is None:
        output_path = os.path.splitext(input_path)[0] + ".mp3"

    output_path = os.path.abspath(output_path)

    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-i", input_path,
        "-c:a", "libmp3lame", "-b:a", bitrate,
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        err_msg = stderr.decode().strip() if stderr else "unknown error"
        raise RuntimeError(f"wav_to_mp3 failed: {err_msg}")

    return output_path


async def mp3_to_wav(input_path: str, output_path: Optional[str] = None) -> str:
    """Convert MP3 audio to WAV using ffmpeg.

    Args:
        input_path: Path to source MP3 file.
        output_path: Destination WAV path. If None, derives from input name.

    Returns:
        Absolute path to the output WAV file.
    """
    if output_path is None:
        output_path = os.path.splitext(input_path)[0] + ".wav"

    output_path = os.path.abspath(output_path)

    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-i", input_path,
        "-c:a", "pcm_s16le",
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        err_msg = stderr.decode().strip() if stderr else "unknown error"
        raise RuntimeError(f"mp3_to_wav failed: {err_msg}")

    return output_path


async def png_to_jpg(input_path: str, output_path: Optional[str] = None,
                     quality: int = 90) -> str:
    """Convert PNG image to JPEG.

    On macOS: uses builtin `sips` command. On other platforms: falls back to ffmpeg.

    Args:
        input_path: Path to source PNG file.
        output_path: Destination JPG path. If None, derives from input name.
        quality: JPEG quality 1-100 (used by ffmpeg fallback).

    Returns:
        Absolute path to the output JPEG file.
    """
    if output_path is None:
        output_path = os.path.splitext(input_path)[0] + ".jpg"

    output_path = os.path.abspath(input_path)

    if platform.system() == "Darwin":
        # macOS sips - fastest, no extra deps
        proc = await asyncio.create_subprocess_exec(
            "sips", "-s", "format", "jpeg", input_path,
            "--out", output_path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            err_msg = stderr.decode().strip() if stderr else "unknown error"
            raise RuntimeError(f"png_to_jpg (sips) failed: {err_msg}")
    else:
        # ffmpeg fallback
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-i", input_path,
            "-q:v", str(max(1, min(31, 31 - quality * 31 // 100))),
            output_path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            err_msg = stderr.decode().strip() if stderr else "unknown error"
            raise RuntimeError(f"png_to_jpg (ffmpeg) failed: {err_msg}")

    return output_path


async def webm_to_mp4(input_path: str, output_path: Optional[str] = None,
                      crf: int = 23) -> str:
    """Convert WebM video to MP4 (h264) using ffmpeg.

    Args:
        input_path: Path to source WebM file.
        output_path: Destination MP4 path. If None, derives from input name.
        crf: Constant Rate Factor for h264 (lower = better quality).

    Returns:
        Absolute path to the output MP4 file.
    """
    if output_path is None:
        output_path = os.path.splitext(input_path)[0] + ".mp4"

    output_path = os.path.abspath(output_path)

    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-i", input_path,
        "-c:v", "libx264", "-preset", "fast",
        "-crf", str(crf),
        "-pix_fmt", "yuv420p",
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        err_msg = stderr.decode().strip() if stderr else "unknown error"
        raise RuntimeError(f"webm_to_mp4 failed: {err_msg}")

    return output_path


async def gif_to_mp4(input_path: str, output_path: Optional[str] = None) -> str:
    """Convert animated GIF to MP4 using ffmpeg.

    Args:
        input_path: Path to source GIF file.
        output_path: Destination MP4 path. If None, derives from input name.

    Returns:
        Absolute path to the output MP4 file.
    """
    if output_path is None:
        output_path = os.path.splitext(input_path)[0] + ".mp4"

    output_path = os.path.abspath(output_path)

    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-i", input_path,
        "-movflags", "faststart",
        "-pix_fmt", "yuv420p",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        output_path,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        err_msg = stderr.decode().strip() if stderr else "unknown error"
        raise RuntimeError(f"gif_to_mp4 failed: {err_msg}")

    return output_path
