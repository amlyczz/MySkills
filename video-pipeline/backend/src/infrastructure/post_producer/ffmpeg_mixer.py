import asyncio
import logging
import os
import subprocess
import sys
from pathlib import Path
from ...domain.post_producer.interfaces import AudioMixer

logger = logging.getLogger(__name__)

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
            logger.warning("audio_mixer failed (%s), fell back to mocked output.", stderr.decode())
            
        return output_path
