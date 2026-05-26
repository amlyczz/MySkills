"""Shared media downloader — downloads images/videos from URLs via yt-dlp.

Used by Twitter analyzer, Repo analyzer, and any other component that needs
to fetch media assets through the configured proxy.
"""

import asyncio
import json
import logging
import os
from typing import Optional

from ..config.app_config import settings

logger = logging.getLogger(__name__)


def _proxy_arg() -> str | None:
    """Build yt-dlp --proxy argument. Port 10808 → socks5:// scheme."""
    proxy = settings.http_proxy
    if not proxy:
        return None
    if "10808" in proxy:
        return proxy.replace("http://", "socks5://")
    return proxy


async def download_media(
    url: str,
    output_dir: str,
    *,
    timeout: int = 120,
) -> list[str]:
    """Download all media (images/videos) from a URL using yt-dlp.

    Returns list of downloaded file paths.
    """
    os.makedirs(output_dir, exist_ok=True)
    output_template = os.path.join(output_dir, "%(title).80s_%(id)s.%(ext)s")
    proxy = _proxy_arg()

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "-o", output_template,
        "--format", "best[ext=mp4]/best[ext=jpg]/best[ext=png]/best",
        "--ignore-errors",
    ]
    if proxy:
        cmd.extend(["--proxy", proxy])
    cmd.append(url)

    logger.info("[MediaDownloader] Downloading from: %s", url[:80])

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.communicate()
        logger.warning("[MediaDownloader] Download timed out for: %s", url[:80])
        return _list_files(output_dir)

    stderr_text = stderr.decode("utf-8", errors="replace") if stderr else ""
    if stderr_text and proc.returncode != 0:
        logger.warning("[MediaDownloader] yt-dlp stderr: %s", stderr_text[:300])

    return _list_files(output_dir)


async def fetch_metadata(url: str, timeout: int = 60) -> dict | None:
    """Fetch page/tweet metadata as JSON via yt-dlp --dump-json."""
    proxy = _proxy_arg()
    cmd = ["yt-dlp", "--dump-json", "--no-playlist"]
    if proxy:
        cmd.extend(["--proxy", proxy])
    cmd.append(url)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.communicate()
        logger.warning("[MediaDownloader] --dump-json timed out: %s", url[:80])
        return None

    stdout_text = stdout.decode("utf-8", errors="replace") if stdout else ""
    if proc.returncode != 0 or not stdout_text.strip():
        return None

    try:
        return json.loads(stdout_text)
    except json.JSONDecodeError:
        return None


def _list_files(directory: str) -> list[str]:
    """List all non-empty files in a directory."""
    result: list[str] = []
    if not os.path.isdir(directory):
        return result
    for fname in sorted(os.listdir(directory)):
        fpath = os.path.join(directory, fname)
        if os.path.isfile(fpath) and os.path.getsize(fpath) > 0:
            result.append(fpath)
    return result
