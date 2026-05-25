from typing import Optional
from pydantic import BaseModel

class MixAudioRequest(BaseModel):
    """Audio mix request parameters."""
    video_path: str
    voiceover_path: str = ""
    bgm_path: str = ""
    timeline_path: str
    output_path: str = "final.mp4"
    sfx_dir: Optional[str] = None
    bgm_offset: float = 0.5
    bgm_tail: float = 1.0
