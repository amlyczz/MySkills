"""Unified subprocess helpers for the project.

Replaces the 3 different subprocess patterns used across
audio_mixer.py, minimax.py, deepseek.py, format.py, and download.py.

Usage:
    from shared.utils.process import run_sync, run_async

    result = run_sync(["ffmpeg", "-i", "input.mp4", "output.mp3"], timeout=120)
    await run_async(["mmx", "image", "generate", "--prompt", prompt, ...])
"""

import asyncio
import subprocess


def run_sync(cmd: list[str], timeout: float = 300.0, check: bool = True) -> subprocess.CompletedProcess:
    """Run a subprocess synchronously with consistent error handling.

    Raises RuntimeError on non-zero exit (if check=True) or subprocess.TimeoutExpired.
    """
    result = subprocess.run(cmd, capture_output=True, timeout=timeout)
    if check and result.returncode != 0:
        stderr = result.stderr.decode()[-2000:] if result.stderr else ""
        raise RuntimeError(
            f"Command failed (exit {result.returncode}): {' '.join(cmd[:8])}...\n{stderr}"
        )
    return result


async def run_async(cmd: list[str], timeout: float = 300.0) -> None:
    """Run a subprocess asynchronously. Raises RuntimeError on failure or timeout."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise RuntimeError(f"Command timed out after {timeout}s: {' '.join(cmd[:8])}")

    if proc.returncode != 0:
        err_msg = stderr.decode().strip() if stderr else "unknown error"
        raise RuntimeError(f"Command exited {proc.returncode}: {err_msg}")


async def run_async_with_stdout(cmd: list[str], timeout: float = 120.0) -> str:
    """Run a subprocess asynchronously and capture stdout. Raises RuntimeError on failure."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise RuntimeError(f"Command timed out after {timeout}s: {' '.join(cmd[:8])}")

    if proc.returncode != 0:
        err_msg = stderr.decode().strip() if stderr else "unknown error"
        raise RuntimeError(f"Command exited {proc.returncode}: {err_msg}")

    return stdout.decode().strip() if stdout else ""


async def run_curl(url: str, headers: dict[str, str], body: str,
                   timeout: float = 120.0) -> str:
    """Run curl with headers and body, return response text."""
    args = ["curl", "-sS", "--connect-timeout", "30", "--max-time", str(int(timeout))]
    for k, v in headers.items():
        args += ["-H", f"{k}: {v}"]
    args += ["-d", body, url]
    return await run_async_with_stdout(args, timeout=timeout)
