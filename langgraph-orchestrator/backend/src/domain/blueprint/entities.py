from pydantic import BaseModel, Field

class SceneConfig(BaseModel):
    layoutId: str
    motionMap: dict[str, str] = Field(default_factory=dict)
    content: dict[str, str] = Field(default_factory=dict)

class Blueprint(BaseModel):
    version: str = "1.0.0"
    fps: int = 30
    durationInFrames: int
    compositionWidth: int = 1920
    compositionHeight: int = 1080
    scenes: list[SceneConfig] = Field(default_factory=list)
