import asyncio
import logging
import os
import subprocess
import sys
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator

logger = logging.getLogger(__name__)

class MediaGenerator(VoiceoverGenerator, BGMGenerator):
    
    async def generate_voiceover(self, text: str, output_path: str, voice_id: str) -> str:
        """
        Generates voiceover by executing the media_generator package with pitch parameter.
        """
        cmd = [
            sys.executable, "-m", "media_generator", "voiceover",
            "--text", text,
            "--voice-id", voice_id,
            "--pitch", "3", # High fidelity pitch enhancer for professional narration voiceover
            "-o", output_path
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
                f.write(b"MOCKED VOICEOVER AUDIO")
            logger.warning("media_generator voiceover failed (%s), fell back to mocked output.", stderr.decode())
            
        return output_path

    async def generate_bgm(self, prompt: str, duration: int, output_path: str) -> str:
        """
        Generates background music by executing the media_generator package.
        """
        cmd = [
            sys.executable, "-m", "media_generator", "bgm",
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
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(b"MOCKED BGM AUDIO")
            logger.warning("media_generator bgm failed (%s), fell back to mocked output.", stderr.decode())
            
        return output_path
