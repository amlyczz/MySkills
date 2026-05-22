"""
enums — 从 contracts/enums/*.json 加载的共享枚举常量。

提供预加载的 frozenset 和默认映射表，供所有层统一引用，
消除各层各自硬编码枚举值的重复问题。
"""

import json
from pathlib import Path
from functools import lru_cache

_ENUMS_DIR = Path(__file__).resolve().parent.parent / "enums"


def _load(name: str) -> dict:
    with open(_ENUMS_DIR / f"{name}.json") as f:
        return json.load(f)


# ── 布局 ──
_layout_data = _load("layouts")
LAYOUTS = frozenset(_layout_data["layouts"])
SCENE_TYPE_DEFAULT_LAYOUT: dict[str, str] = _layout_data.get("scene_type_default_layout", {})

# ── 动效 ──
_motion_data = _load("motions")
MOTIONS = frozenset(_motion_data["motions"])
ELEMENT_ROLE_DEFAULT_MOTION: dict[str, str] = _motion_data.get("element_role_default_motion", {})

# ── 过渡 ──
_transition_data = _load("transitions")
TRANSITIONS = frozenset(_transition_data["transitions"])

# ── 样式 ──
_style_data = _load("styles")
STYLES = frozenset(_style_data["styles"])

# ── 结构 ──
_structure_data = _load("structures")
STRUCTURES = frozenset(_structure_data["structures"])

# ── 素材 ──
_material_data = _load("materials")
MATERIAL_TYPES = frozenset(_material_data["material_types"])
SOURCE_TYPES = frozenset(_material_data["source_types"])
CAPTURE_METHODS = frozenset(_material_data["capture_methods"])
USABLE_MATERIAL_TYPES = frozenset(_material_data.get("usable_material_types", []))

# ── SFX ──
_sfx_data = _load("sfx")
SFX_MOTION_MAP: dict[str, str] = _sfx_data.get("motion_to_sfx", {})
