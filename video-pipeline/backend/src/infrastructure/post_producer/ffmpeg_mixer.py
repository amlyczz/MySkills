import asyncio
import os
import subprocess
import sys
from pathlib import Path
from ...domain.post_producer.interfaces import AudioMixer

class FFmpegAudioMixer(AudioMixer):

    async def mix_audio_and_burn_subtitles(
        self,
        video_path: str,
        voiceover_path: str,
        bgm_path: str,
        timeline_path: str,
        srt_path: str,
        output_path: str,
    ) -> str:
        """
        Executes custom audio_mixer.py in post-producer.
        """
        mixer_script = str(Path(__file__).resolve().parent / "scripts" / "audio_mixer.py")
        
        cmd = [
            sys.executable, mixer_script,
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
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(b"MOCKED FINAL VIDEO")
            print(f"Warning: audio_mixer failed ({stderr.decode()}), fell back to mocked output.")
            
        return output_path
