from langchain_core.tools import tool
import asyncio
import os
import subprocess

# Note: In a real implementation, we would import from the actual media_generator package.
# Here we adapt it as a LangChain Tool.

@tool
async def generate_voiceover_tool(text: str, output_path: str, voice_id: str = "Chinese (Mandarin)_Male_Announcer") -> str:
    """Generate voiceover audio from text using the media-generator CLI."""
    # Assuming media_generator is available in the environment path or we call it via python module
    cmd = [
        "python3", "-m", "media_generator", "voiceover",
        "--text", text,
        "--voice-id", voice_id,
        "-o", output_path
    ]
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        raise Exception(f"Voiceover generation failed: {stderr.decode()}")
    return f"Voiceover generated successfully at {output_path}"

@tool
async def generate_bgm_tool(prompt: str, duration: int, output_path: str) -> str:
    """Generate background music using the media-generator CLI."""
    cmd = [
        "python3", "-m", "media_generator", "bgm",
        "--prompt", prompt,
        "--duration", str(duration),
        "-o", output_path
    ]
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        raise Exception(f"BGM generation failed: {stderr.decode()}")
    return f"BGM generated successfully at {output_path}"
