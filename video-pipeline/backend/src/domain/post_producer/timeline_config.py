from pydantic import BaseModel, Field

class GlobalTimelineConfig(BaseModel):
    """Global timeline configuration."""
    title: str = ""
    total_duration: float = Field(default=180, ge=0)
    resolution: tuple[int, int] = (1920, 1080)
    fps: int = 30
    bgm_track: str = "bgm_ambient_tech"
    bgm_volume: float = Field(default=0.2, ge=0, le=1)
    progress_bar_style: str = "labeled-bar"
