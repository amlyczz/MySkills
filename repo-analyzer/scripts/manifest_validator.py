#!/usr/bin/env python3
"""
manifest_validator.py — 素材清单加载与验证

从 allocate.py (v3) 拆分出的职责：
  - MATERIAL_TYPE_ENUM / USABLE_MATERIAL_TYPES 常量（从 pipeline-contracts 引用）
  - load_manifest() / validate_manifest()

Usage:
    from manifest_validator import load_manifest, validate_manifest, MATERIAL_TYPE_ENUM
"""

from pydantic import BaseModel, Field
from pipeline_contracts.enums import MATERIAL_TYPES, USABLE_MATERIAL_TYPES


# All 15 material types from v2 material_manifest.schema.json (from shared enum source)
MATERIAL_TYPE_ENUM = MATERIAL_TYPES

# Types usable as visual material (from shared enum source)
USABLE_MATERIAL_TYPES_SET = USABLE_MATERIAL_TYPES


class ManifestMaterial(BaseModel):
    """单个素材条目的 Pydantic 约束（兼容 v2 + v1）。"""
    type: str
    path: str
    duration: float = 0.0
    sourceUrl: str = ""
    label: str = ""


class Manifest(BaseModel):
    """完整的 material manifest，兼容 v2 (materials[]) 和 v1 (entries[])。"""
    version: str = "legacy"
    materials: list[ManifestMaterial] = Field(default_factory=list, alias="entries")

    model_config = {"populate_by_name": True}


def load_manifest(data: dict | list) -> Manifest:
    """加载并验证 manifest，自动归一化 v2/v1/array 格式为统一 Manifest。"""
    # Plain array format (deprecated)
    if isinstance(data, list):
        return Manifest(
            version="legacy",
            materials=[ManifestMaterial(type=item["type"], path=item["path"])
                       for item in data if isinstance(item, dict) and "type" in item and "path" in item],
        )

    # v2: {"version": "2", "materials": [...]}
    if isinstance(data, dict):
        version = data.get("version", "legacy")
        items = data.get("materials", data.get("entries", []))
        if isinstance(items, list):
            materials = []
            for item in items:
                if isinstance(item, dict) and "type" in item and "path" in item:
                    materials.append(ManifestMaterial(
                        type=item["type"],
                        path=item["path"],
                        duration=item.get("duration", 0),
                    ))
            return Manifest(version=version, materials=materials)

    return Manifest(version="invalid")


def validate_manifest(data, strict=False) -> tuple[bool, list[str], list[dict]]:
    """Validate manifest data against schema. Returns (is_valid, errors, manifest_entries).

    Uses Pydantic Manifest model for validation.
    Accepts v2, v1, and plain-array formats.
    """
    errors = []
    manifest = load_manifest(data)
    entries = manifest.materials  # normalized list

    # Validate each entry's type is known
    valid_entries = []
    for i, item in enumerate(entries):
        if item.type not in MATERIAL_TYPE_ENUM:
            errors.append(f"Entry {i}: unknown type '{item.type}'")
            if not strict:
                continue
        valid_entries.append({"type": item.type, "path": item.path, "duration": item.duration})

    if strict and errors:
        return False, errors, valid_entries

    return (len(valid_entries) > 0), errors, valid_entries
