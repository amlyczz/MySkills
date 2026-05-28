import asyncio
import os
import subprocess
import shutil
import logging

from ...domain.post_producer.interfaces import MediaProcessor

logger = logging.getLogger(__name__)


class FFmpegMediaProcessor(MediaProcessor):
    """MediaProcessor implementation using FFmpeg."""

    async def get_audio_duration(self, audio_path: str) -> float:
        """Probe actual audio duration in seconds using ffprobe (async)."""
        try:
            process = await asyncio.create_subprocess_exec(
                "ffprobe", "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audio_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10.0)
            except asyncio.TimeoutError:
                process.kill()
                await process.communicate()
                return 0.0
            if process.returncode == 0 and stdout.strip():
                return float(stdout.strip())
        except (FileNotFoundError, ValueError):
            pass
        return 0.0

    async def concat_audio(self, segment_paths: list[str], output_path: str) -> None:
        """Concatenate multiple audio files into one."""
        if not segment_paths:
            return

        if len(segment_paths) == 1:
            await asyncio.to_thread(shutil.copy2, segment_paths[0], output_path)
            return

        list_path = output_path + ".concat.txt"
        with open(list_path, "w", encoding="utf-8") as f:
            for p in segment_paths:
                f.write(f"file '{p}'\n")

        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", list_path, "-c", "copy", output_path,
        ]
        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()

        if os.path.exists(list_path):
            os.remove(list_path)

        if process.returncode != 0:
            await asyncio.to_thread(shutil.copy2, segment_paths[0], output_path)
            logger.warning("[FFmpegMediaProcessor] Warning: concat failed, using first segment only")
