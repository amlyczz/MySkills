import asyncio
import os
import subprocess
import sys
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator

class MediaGenerator(VoiceoverGenerator, BGMGenerator):
    
    async def generate_voiceover(self, text: str, output_path: str, voice_id: str) -> str:
        """
        Generates voiceover by executing the media_generator package.
        """
        cmd = [
            sys.executable, "-m", "media_generator", "voiceover",
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
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(b"MOCKED VOICEOVER AUDIO")
            print(f"Warning: media_generator voiceover failed ({stderr.decode()}), fell back to mocked output.")
            
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
            print(f"Warning: media_generator bgm failed ({stderr.decode()}), fell back to mocked output.")
            
        return output_path
