from abc import ABC, abstractmethod
from typing import Optional

from .entities import MixAudioRequest


class VoiceoverGenerator(ABC):

    @abstractmethod
    async def generate_voiceover(
        self,
        text: str,
        output_path: str,
        voice_id: str = "default",
        style: Optional[str] = None,
    ) -> str:
        """Generates voiceover from text.

        Args:
            text: Text to synthesize.
            output_path: Where to write the audio file (.mp3).
            voice_id: Provider-specific voice identifier.
            style: Optional natural language style instruction (e.g. "用沉稳专业的男声朗读").
        """
        pass


class BGMGenerator(ABC):

    @abstractmethod
    async def generate_bgm(self, prompt: str, duration: int, output_path: str) -> str:
        """Generates background music based on prompt and duration."""
        pass


class AudioMixer(ABC):

    @abstractmethod
    async def mix_audio_and_burn_subtitles(
        self,
        video_path: str,
        voiceover_path: str,
        bgm_path: str,
        timeline_path: str,
        srt_path: str,
        output_path: str,
    ) -> str:
        """Duck BGM, normalized loudnorm voiceover, and burn srt hard subtitles into final video."""
        pass


class PostProducer(ABC):

    @abstractmethod
    async def post_process(self, mix_request: MixAudioRequest) -> str:
        """Run the full post-production pipeline: mix audio, burn subtitles."""
        pass
