import asyncio
import subprocess

async def mix_audio_and_burn_subtitles(
    video_path: str, 
    voiceover_path: str, 
    bgm_path: str, 
    timeline_path: str, 
    srt_path: str, 
    output_path: str
):
    """
    Adapter for the post-producer audio_mixer.py script.
    Performs Sidechain Ducking, Loudnorm, and subtitle burning.
    """
    cmd = [
        "python3", "../../post-producer/scripts/audio_mixer.py",
        video_path,
        voiceover_path,
        bgm_path,
        timeline_path,
        "--output", output_path,
        "--srt", srt_path
    ]
    
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    
    if process.returncode != 0:
        raise Exception(f"Post-processing failed: {stderr.decode()}")
        
    return output_path
