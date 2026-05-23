"""Speech synthesis (TTS) capability types."""

from typing import Optional

from pydantic import BaseModel


class VoiceInfo(BaseModel):
    id: str
    name: str
    language: str           # "zh-CN" | "en-US" | ...
    gender: str             # "male" | "female" | "neutral"
    style: Optional[str] = None
    sample_url: Optional[str] = None


class SpeechRequest(BaseModel):
    text: str
    voice_id: str
    speed: float = 1.0      # 0.5 - 2.0
    pitch: int = 0           # -12 - 12
    format: str = "mp3"
    sample_rate: int = 24000


class SpeechResult(BaseModel):
    audio_path: str          # local file path
    format: str = "mp3"
    duration_seconds: float = 0.0
    sample_rate: int = 24000
