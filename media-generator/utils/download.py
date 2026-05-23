"""URL → local file download helpers."""

import os
import asyncio
import tempfile
from urllib.parse import urlparse


async def download_file(
    url: str,
    dest_path: str | None = None,
    timeout: float = 120.0,
) -> str:
    """Download a URL to a local file using curl (async subprocess).

    Args:
        url: Source URL.
        dest_path: Destination file path. If None, a temp file is created.
                   The caller is responsible for cleanup of temp files.
        timeout: Download timeout in seconds.

    Returns:
        Absolute path to the downloaded file.

    Raises:
        RuntimeError: If curl exits non-zero.
        asyncio.TimeoutError: If download exceeds timeout.
    """
    if dest_path is None:
        # Derive extension from URL or default to .bin
        parsed = urlparse(url)
        ext = os.path.splitext(parsed.path)[1] or ".bin"
        fd, dest_path = tempfile.mkstemp(suffix=ext)
        os.close(fd)

    dest_path = os.path.abspath(dest_path)

    proc = await asyncio.create_subprocess_exec(
        "curl", "-sSL", "-o", dest_path, url,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise

    if proc.returncode != 0:
        err_msg = stderr.decode().strip() if stderr else "unknown error"
        raise RuntimeError(f"Download failed (exit {proc.returncode}): {err_msg}")

    return dest_path
