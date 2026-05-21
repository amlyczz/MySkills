"""MediaGenerator: unified entry point for media generation.

Resolves user-friendly aliases → capability → provider chain → generation.
Handles provider degradation: tries each configured provider in order,
returns the first successful result or a failure result.
"""

import os
import json
from typing import Optional

from .providers.base import GenerationResult, UnsupportedCapabilityError, BaseProvider
from .providers.minimax import MiniMaxProvider
from .providers.deepseek import DeepSeekProvider

_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "media_config.json")


class MediaGenerator:
    """Generate images, speech, music, and video via configured providers.

    Usage:
        media = MediaGenerator()
        result = await media.generate("cover_image", prompt="...", aspect_ratio="3:4")
        result = await media.generate("voiceover", text="...", voice_id="male-tech-01")
        result = await media.generate("bgm", prompt="ambient", instrumental=True)

    Text tasks (scripts, titles, copy, code analysis) are handled by code agent
    directly — NOT through MediaGenerator. This class only handles media generation.
    """

    def __init__(self, config_path: Optional[str] = None):
        self._config = self._load_config(config_path or _CONFIG_PATH)
        self._providers: dict[str, BaseProvider] = {}
        self._init_providers()

    # ── Public API ───────────────────────────────────────────

    async def generate(self, alias: str, **kwargs) -> GenerationResult:
        """Generate media by alias name.

        Args:
            alias: User-facing name, e.g. "cover_image", "voiceover", "bgm", "video_clip".
            **kwargs: Forwarded to the provider's capability handler.

        Returns:
            GenerationResult with data on success or error info on failure.
        """
        # 1. Resolve alias
        alias_config = self._config.get("aliases", {}).get(alias)
        if alias_config is None:
            return GenerationResult.fail(
                "UNKNOWN_ALIAS",
                f"Alias '{alias}' not found in media_config.json",
            )

        # Alias can be a string ("image") or an object with providers list
        if isinstance(alias_config, str):
            capability = alias_config
            provider_chain = self._config.get("defaults", {}).get(capability, {})
            provider_entries = [provider_chain] if provider_chain else []
        else:
            capability = alias_config.get("capability", "")
            provider_entries = alias_config.get("providers", [alias_config])

        if not capability:
            return GenerationResult.fail("BAD_CONFIG", f"No capability for alias '{alias}'")

        # 2. Try each provider in the chain
        last_error = None
        for entry in provider_entries:
            provider_name = entry.get("provider", "")
            model = entry.get("model", "")
            provider = self._providers.get(provider_name)

            if provider is None:
                last_error = GenerationResult.fail("NO_PROVIDER",
                                                   f"Provider '{provider_name}' not available")
                continue

            try:
                result = await provider.generate(capability, **kwargs)
                if result.success:
                    return result
                last_error = result
            except UnsupportedCapabilityError as e:
                last_error = GenerationResult.fail("UNSUPPORTED", str(e), provider_name)
                continue
            except Exception as e:
                last_error = GenerationResult.fail("PROVIDER_ERROR", str(e), provider_name)
                continue

        # 3. All providers failed — return last error
        return last_error or GenerationResult.fail("ALL_FAILED",
                                                    f"No provider succeeded for alias '{alias}'")

    # ── Internals ────────────────────────────────────────────

    @staticmethod
    def _load_config(path: str) -> dict:
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Media config not found: {path}")
        with open(path, "r") as f:
            return json.load(f)

    def _init_providers(self):
        """Instantiate configured providers."""
        providers_cfg = self._config.get("providers", {})
        for name, cfg in providers_cfg.items():
            if name == "minimax":
                model_overrides: dict[str, str] = {}
                if "models" in cfg:
                    for cap, models in cfg["models"].items():
                        if models:
                            model_overrides[cap] = models[0]
                self._providers[name] = MiniMaxProvider(model_overrides=model_overrides or None)
            elif name == "deepseek":
                model = cfg.get("models", {}).get("specialized_text", ["deepseek-chat"])[0]
                self._providers[name] = DeepSeekProvider(model=model)
            # Future providers (openai, etc.) added here
