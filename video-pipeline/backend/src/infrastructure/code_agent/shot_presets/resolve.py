"""Shot preset resolution: expand preset references into full SceneConfig."""

import json
import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)

PRESETS_DIR = os.path.dirname(os.path.abspath(__file__))


def load_preset(preset_id: str) -> dict:
    """Load a shot preset JSON file by ID."""
    path = os.path.join(PRESETS_DIR, f"{preset_id}.json")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Shot preset not found: {preset_id}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def list_presets() -> list[dict]:
    """List all available shot presets with id, name, description, slots."""
    presets = []
    for fname in os.listdir(PRESETS_DIR):
        if fname.endswith(".json") and fname != "resolve.py":
            try:
                with open(os.path.join(PRESETS_DIR, fname), encoding="utf-8") as f:
                    data = json.load(f)
                    presets.append({
                        "id": data["id"],
                        "name": data["name"],
                        "description": data["description"],
                        "slots": list(data.get("slots", {}).keys()),
                    })
            except Exception:
                pass
    return presets


def render_template(template: Any, slots: dict[str, Any]) -> Any:
    """Recursively replace {{slotName}} placeholders in template with slot values."""
    if isinstance(template, str):
        for key, val in slots.items():
            template = template.replace(f"{{{{{key}}}}}", str(val))
        return template
    if isinstance(template, dict):
        return {k: render_template(v, slots) for k, v in template.items()}
    if isinstance(template, list):
        return [render_template(item, slots) for item in template]
    return template


def resolve_presets(bp: dict) -> dict:
    """Expand preset references in blueprint scenes.

    Scenes with a "preset" key are replaced by the preset template with slots filled in.
    """
    for scene in bp.get("scenes", []):
        preset_id = scene.pop("preset", None)
        if not preset_id:
            continue
        slots = scene.pop("slots", {})
        preset = load_preset(preset_id)
        resolved = render_template(preset["template"], slots)
        # Merge resolved template into scene (scene's own fields take precedence)
        for key, val in resolved.items():
            if key not in scene:
                scene[key] = val
        logger.info(f"Resolved preset '{preset_id}' for scene '{scene.get('id', '?')}'")
    return bp


def get_preset_summary() -> str:
    """Get a text summary of all presets for LLM prompt injection."""
    presets = list_presets()
    lines = []
    for p in presets:
        slots_str = ", ".join(p["slots"]) if p["slots"] else "none"
        lines.append(f"- {p['id']} — {p['name']}: {p['description']}. Slots: {slots_str}")
    return "\n".join(lines)
