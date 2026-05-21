"""Content-addressable local cache for media generation results.

Hash-based: sha256(alias + sorted kwargs) → cache key.
Reuses results when identical generation requests are made.

Cache layout:
    {cache_dir}/
        {key}.meta.json    ← serialized GenerationResult metadata
        {key}.data.json    ← serialized data payload (for non-file results like text)
        {key}/             ← symlink/copy of generated files
"""

import os
import json
import hashlib
import shutil
from pathlib import Path
from typing import Optional

from pydantic import BaseModel
from ..providers.base import GenerationResult


DEFAULT_CACHE_DIR = os.path.join(os.path.expanduser("~"), ".cache", "myskills", "media")


class CacheMeta(BaseModel):
    key: str
    alias: str
    created_at: str = ""
    file_path: str = ""
    provider: str = ""
    model: str = ""


class MediaCache:
    """Caches generation results keyed by (alias + params) hash.

    Usage:
        cache = MediaCache()
        result = cache.get(alias, **kwargs)
        if result is None:
            result = await provider.generate(...)
            cache.put(alias, result, **kwargs)
    """

    def __init__(self, cache_dir: str = DEFAULT_CACHE_DIR):
        self._dir = Path(cache_dir)
        self._dir.mkdir(parents=True, exist_ok=True)

    def get(self, alias: str, **kwargs) -> GenerationResult | None:
        """Check cache for a matching result.

        Returns a GenerationResult with data populated on cache hit,
        or None on cache miss.
        """
        key = self._make_key(alias, **kwargs)
        meta_path = self._dir / f"{key}.meta.json"
        data_path = self._dir / f"{key}.data.json"

        if not meta_path.exists():
            return None

        try:
            with open(meta_path, "r") as f:
                meta = json.load(f)

            # Verify the cached file still exists
            file_path = meta.get("file_path", "")
            if file_path and not os.path.exists(file_path):
                return None  # stale cache

            # Reconstruct result
            data = None
            if data_path.exists():
                with open(data_path, "r") as f:
                    data = json.load(f)

            return GenerationResult(
                success=True,
                data=data,
                metadata={
                    "provider": meta.get("provider", ""),
                    "model": meta.get("model", ""),
                    "cached": True,
                },
            )
        except (json.JSONDecodeError, KeyError):
            return None

    def put(self, alias: str, result: GenerationResult, **kwargs):
        """Store a generation result in the cache."""
        if not result.success:
            return  # don't cache failures

        key = self._make_key(alias, **kwargs)

        # Extract file path from result data if it has one
        file_path = ""
        if result.data:
            fp = self._extract_path(result.data)
            if fp and os.path.exists(fp):
                # Copy to cache
                ext = os.path.splitext(fp)[1]
                cache_file = self._dir / f"{key}{ext}"
                if not cache_file.exists():
                    shutil.copy2(fp, cache_file)
                file_path = str(cache_file)

        # Write metadata
        meta = {
            "key": key,
            "alias": alias,
            "created_at": "",
            "file_path": file_path,
            "provider": result.metadata.provider,
            "model": result.metadata.model,
        }
        with open(self._dir / f"{key}.meta.json", "w") as f:
            json.dump(meta, f, indent=2)

        # Write data payload for text results
        data = result.data
        if isinstance(data, BaseModel):
            data = data.model_dump()
        if isinstance(data, dict):
            with open(self._dir / f"{key}.data.json", "w") as f:
                json.dump(data, f, ensure_ascii=False)

    # ── Helpers ──────────────────────────────────────────────

    @staticmethod
    def _make_key(alias: str, **kwargs) -> str:
        """Generate a cache key from alias + sorted kwargs."""
        raw = alias + "|" + json.dumps(kwargs, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    @staticmethod
    def _extract_path(data) -> str:
        """Extract local file path from a result data object."""
        if isinstance(data, dict):
            # Try common path keys
            for k in ("audio_path", "video_path", "local_path"):
                if data.get(k):
                    return data[k]
            # Try images[0].local_path
            images = data.get("images", [])
            if images and isinstance(images, list):
                return images[0].get("local_path", "")
        if isinstance(data, BaseModel):
            d = data.model_dump()
            for k in ("audio_path", "video_path"):
                if d.get(k):
                    return d[k]
            images = d.get("images", [])
            if images and isinstance(images, list):
                return images[0].get("local_path", "")
        return ""
