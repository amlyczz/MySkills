from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field

from .blueprint_meta import BlueprintMeta
from .element_config import ElementConfig
from .global_settings import GlobalSettings
from .scene_background import SceneBackground
from .scene_config import SceneConfig
from .variables import BlueprintVariables

class Blueprint(BaseModel):
    """Complete Remotion Blueprint — mirrors engine types.ts Blueprint interface.

    Serialized JSON from this model is directly consumable by the Remotion engine.
    """
    model_config = ConfigDict(extra="allow")
    meta: BlueprintMeta
    data: Optional[dict[str, Any]] = None
    variables: Optional[BlueprintVariables] = None
    globalSettings: GlobalSettings = Field(default_factory=GlobalSettings)
    globalBackground: Optional[SceneBackground] = None
    globalOverlays: Optional[list[ElementConfig]] = None
    scenes: list[SceneConfig] = Field(default_factory=list)

    def to_json(self) -> dict:
        """Serialize to engine-consumable dict."""
        return self.model_dump(by_alias=True, exclude_none=True)

    @classmethod
    def from_dict(cls, data: dict) -> "Blueprint":
        """Deserialize from engine-compatible dict."""
        return cls.model_validate(data)

    def calculate_total_frames(self) -> int:
        """Calculate total frame count for TransitionSeries rendering.

        Mirrors the calculateTotalFrames helper from types.ts.
        """
        sorted_scenes = sorted(self.scenes, key=lambda s: s.startFrame)
        total = 0
        for i, scene in enumerate(sorted_scenes):
            total += scene.durationInFrames
            if (
                i < len(sorted_scenes) - 1
                and scene.transitionToNext
                and scene.transitionToNext.type != "none"
            ):
                total -= scene.transitionToNext.durationInFrames
        return max(1, total)
