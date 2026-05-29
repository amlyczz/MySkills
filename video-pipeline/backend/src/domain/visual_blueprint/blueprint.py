from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field

from .blueprint_meta import BlueprintMeta
from .element_config import ElementConfig
from .global_settings import GlobalSettings
from .normalize import normalize_blueprint
from .scene_background import SceneBackground
from .scene_config import SceneConfig
from .validate import validate_and_fix
from .variables import BlueprintVariables

class Blueprint(BaseModel):
    """Blueprint v2: LLM generates seconds, to_engine_json() normalizes to frames for Remotion."""
    model_config = ConfigDict(extra="allow")
    meta: BlueprintMeta
    data: Optional[dict[str, Any]] = None
    variables: Optional[BlueprintVariables] = None
    globalSettings: GlobalSettings = Field(default_factory=GlobalSettings)
    globalBackground: Optional[SceneBackground] = None
    globalOverlays: Optional[list[ElementConfig]] = None
    scenes: list[SceneConfig] = Field(default_factory=list)

    def to_engine_json(self) -> dict:
        """Serialize + normalize + validate → Remotion-consumable dict.

        Pipeline: LLM seconds → normalize_blueprint() → validate_and_fix() → frame JSON
        """
        raw = self.model_dump(by_alias=True, exclude_none=True)
        normalized = normalize_blueprint(raw)
        validated = validate_and_fix(normalized)
        return validated

    def to_json(self) -> dict:
        """Legacy alias — use to_engine_json() for full pipeline."""
        return self.model_dump(by_alias=True, exclude_none=True)

    @classmethod
    def from_dict(cls, data: dict) -> "Blueprint":
        """Deserialize from dict (seconds or frames accepted)."""
        return cls.model_validate(data)
