"""
llm_matcher.py — LLM-driven template matching agent.

Replaces/augments the rule-based matching in allocate.py with an LLM that
understands content semantics, brand tone, and audience to make intelligent
template selections.

Usage:
    from pipeline_orchestrator.llm_matcher import LLMMatcher, MatchingRequest

    matcher = LLMMatcher(api_key="...", provider="deepseek")
    request = MatchingRequest(title="My Project", points=[...], ...)
    result = matcher.match(request)
    # result.structure_id, result.style_id, result.scene_configs, ...

Architecture:
    LLM matching (intelligent, when API key + provider configured)
        |
        v
    Zod/Pydantic validation (Task 3 — enforces schema)
        |
        v
    Rule-based fallback (always works, no API needed)
"""
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from typing import Optional

# ── Data classes ──

@dataclass
class MatchingRequest:
    """Input to the matching engine — mirrors TypeScript MatchingInput."""
    title: str
    tagline: str = ""
    points: list[str] = field(default_factory=list)
    summary: str = ""
    url: str = ""
    stats: str = ""
    language: str = ""
    topics: list[str] = field(default_factory=list)
    is_demo_heavy: bool = False
    total_duration: float = 180
    # Asset inventory
    extracted_videos: list[dict] = field(default_factory=list)
    images: list[dict] = field(default_factory=list)
    scroll_videos: list[dict] = field(default_factory=list)
    link_videos: list[dict] = field(default_factory=list)


@dataclass
class MatchingResult:
    """Output from matching — validated VideoConfig subset."""
    structure_id: str
    style_id: str
    bg_type: str
    scene_configs: dict
    reasoning: str = ""


# ── Template catalog for prompt construction ──

STRUCTURE_CATALOG = [
    {
        "id": "funnel",
        "name": "漏斗型叙事",
        "scenes": "hook → problem → solution → showcase → features → cta",
        "bestFor": ["通用项目", "GitHub 开源仓库", "工具/框架宣传"],
    },
    {
        "id": "timeline",
        "name": "时间线叙事",
        "scenes": "hook → origin → milestones → showcase → today → cta",
        "bestFor": ["版本演进", "Changelog 展示", "项目历史回顾"],
    },
    {
        "id": "product-showcase",
        "name": "产品展示型",
        "scenes": "hook → problem → demo → features → proof → cta",
        "bestFor": ["Demo 丰富的项目", "可视化产品", "有 GIF/视频素材"],
    },
    {
        "id": "performance-launch",
        "name": "性能发布型",
        "scenes": "hook → proof(x2) → showcase → features → cta",
        "bestFor": ["数据驱动发布", "性能优化 PR", "Benchmark 展示"],
    },
]

STYLE_CATALOG = [
    {"family": "tech", "ids": ["dark-purple", "tech-grid", "neon-blue"], "mood": ["dark", "tech", "code", "data"], "bestFor": ["开发工具", "框架", "底层技术"], "bgType": "starfield"},
    {"family": "business", "ids": ["corporate-gray", "ink-dark", "paper-light"], "mood": ["professional", "clean", "modern"], "bestFor": ["商业产品", "B2B", "企业级"], "bgType": "geometric"},
    {"family": "creative", "ids": ["sakura-pink", "glassmorphism", "ocean-cyan"], "mood": ["creative", "design", "modern"], "bestFor": ["创意工具", "设计系统", "前端框架"], "bgType": "fluid-gradient"},
    {"family": "minimal", "ids": ["matte-metal", "minimal-bw"], "mood": ["minimal", "dark", "stark"], "bestFor": ["极简项目", "CLI 工具", "底层库"], "bgType": "bokeh"},
    {"family": "playful", "ids": ["warm-orange", "warm-yellow", "retro-warm"], "mood": ["warm", "energetic", "creative"], "bestFor": ["社区项目", "教育工具", "游戏"], "bgType": "fluid-gradient"},
]

LAYOUT_CATALOG = {
    "hook":       {"primary": "center-layout", "alternatives": ["split-layout", "title"]},
    "problem":    {"primary": "center-layout", "alternatives": ["split-layout", "quote-card"]},
    "solution":   {"primary": "split-layout", "alternatives": ["center-layout", "icon-grid"]},
    "feature":    {"primary": "icon-grid", "alternatives": ["center-layout", "stat-card"]},
    "showcase":   {"primary": "split-media", "alternatives": ["browser-mockup", "coverflow-carousel"]},
    "proof":      {"primary": "stat-card", "alternatives": ["icon-grid", "quote-card"]},
    "cta":        {"primary": "center-layout", "alternatives": ["title", "cta-button"]},
    "demo":       {"primary": "split-media", "alternatives": ["browser-mockup"]},
    "origin":     {"primary": "center-layout", "alternatives": ["split-layout"]},
    "milestones": {"primary": "icon-grid", "alternatives": ["stat-card"]},
    "today":      {"primary": "stat-card", "alternatives": ["center-layout"]},
}

MOTION_CATALOG = {
    "title":    {"primary": "scale-bounce", "alternatives": ["fade-up", "fade-down"]},
    "subtitle": {"primary": "fade-up", "alternatives": ["scale-in"]},
    "points":   {"primary": "fade-up", "alternatives": ["slide-up"]},
    "headline": {"primary": "scale-bounce", "alternatives": ["fade-up", "scale-in"]},
    "stats":    {"primary": "scale-in", "alternatives": ["fade-up"]},
}

STYLE_TO_BG = {
    "dark-purple":   {"bgType": "dark-neon",     "primary": "#A855F7"},
    "neon-blue":     {"bgType": "dark-neon",     "primary": "#3B82F6"},
    "tech-grid":     {"bgType": "tech-overlay",  "primary": "#00F5D4"},
    "matte-metal":   {"bgType": "noise-background", "primary": "#6B7280"},
    "sakura-pink":   {"bgType": "aurora-bg",    "primary": "#F48FB1"},
    "ocean-cyan":    {"bgType": "fluid-aurora", "primary": "#06B6D4"},
    "warm-orange":   {"bgType": "fluid-background", "primary": "#F97316"},
    "corporate-gray": {"bgType": "dot-grid-bg", "primary": "#6366F1"},
    "deep-green":    {"bgType": "dark-neon",     "primary": "#10B981"},
    "paper-light":   {"bgType": "dot-grid-bg",  "primary": "#78716C"},
    "ink-dark":      {"bgType": "noise-background", "primary": "#F8FAFC"},
    "retro-warm":    {"bgType": "fluid-background", "primary": "#F59E0B"},
}

# ── Prompt template ──

SYSTEM_PROMPT = """You are a video template matching agent for a Remotion-based video rendering engine. Given a GitHub repository's metadata and content, select the optimal structure, style, layout, and motion templates for a promo video.

## Available Structure Templates
{structures}

## Available Style Templates (by family)
{styles}

## Available Layout Types (by scene) — MUST use registered component IDs
{layouts}

## Available Motion Types (by element role) — MUST use AnimationType enum values
{motions}

## Valid Animation Types
none, fade-in, fade-out, fade-up, fade-down, scale-in, scale-bounce, slide-left, slide-right, slide-up, slide-down, bar-grow, typewriter

## Valid Background Types
dark-neon, fluid-aurora, light-beam, tech-overlay, aurora-bg, fluid-background, noise-background, dot-grid-bg, none

## Output Format
Return a JSON object with this exact structure:
{{
  "structureId": "funnel",
  "styleId": "dark-purple",
  "bgType": "dark-neon",
  "reasoning": "Brief explanation of your choices (1-2 sentences)",
  "sceneConfigs": {{
    "hook": {{
      "layoutId": "center-layout",
      "motionMap": {{ "headline": "scale-bounce" }}
    }},
    "problem": {{
      "layoutId": "center-layout",
      "motionMap": {{ "title": "fade-up", "points": "fade-up" }}
    }}
  }}
}}

## Selection Rules
1. **Structure**: Use "product-showcase" if there are 3+ videos/GIFs. Use "funnel" as default.
2. **Style**: Match to the project's primary language. Tech → tech family. Creative/frontend → creative. CLI/tools → minimal.
3. **Layout**: Use registered component IDs only. hook/problem/cta → center-layout. solution/feature → split-layout or icon-grid. showcase → split-media. proof → stat-card.
4. **Motion**: Use AnimationType enum values only. title/headline → scale-bounce. points → fade-up with stagger. stats → scale-in.
5. **bgType**: Must be a BackgroundType enum value from the catalog.

## Constraints
- All layoutId values MUST be registered component IDs from the catalog.
- All motion values MUST be from the AnimationType enum.
- bgType MUST be a BackgroundType enum value.
- Do NOT invent new IDs — use ONLY what's listed."""


def _build_catalog_text() -> dict[str, str]:
    """Build formatted catalog strings for the prompt."""
    structures = "\n".join(
        f"- {s['id']}: {s['name']} ({s['scenes']}) — best for: {', '.join(s['bestFor'])}"
        for s in STRUCTURE_CATALOG
    )
    styles = "\n".join(
        f"- {s['family']}: {', '.join(s['ids'])} — {', '.join(s['mood'])} — best for: {', '.join(s['bestFor'])}"
        for s in STYLE_CATALOG
    )
    layouts = "\n".join(
        f"- {st}: primary={info['primary']}, alternatives={info['alternatives']}"
        for st, info in LAYOUT_CATALOG.items()
    )
    motions = "\n".join(
        f"- {role}: primary={info['primary']}, alternatives={info['alternatives']}"
        for role, info in MOTION_CATALOG.items()
    )
    return {"structures": structures, "styles": styles, "layouts": layouts, "motions": motions}


# ── LLM Matcher ──

class LLMMatcher:
    """LLM-based matching agent for template selection.

    Tries LLM first, falls back to rule-based matching on failure.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        provider: str = "deepseek",
        model: Optional[str] = None,
    ):
        self.api_key = api_key or os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENAI_API_KEY")
        self.provider = provider
        self.model = model or ("deepseek-chat" if provider == "deepseek" else "gpt-4o-mini")
        self.catalog = _build_catalog_text()

    def match(self, request: MatchingRequest) -> MatchingResult:
        """Main entry point. Tries LLM, falls back to rules."""
        if not self.api_key:
            print("  [LLMMatcher] No API key configured, using rule-based matching")
            return self._rule_based_match(request)

        try:
            result = self._llm_match(request)
            validated = self._validate_and_fix(result)
            return validated
        except Exception as e:
            print(f"  [LLMMatcher] LLM matching failed ({e}), falling back to rules")
            return self._rule_based_match(request)

    def _build_user_prompt(self, request: MatchingRequest) -> str:
        """Build the user prompt with repo info."""
        parts = [
            f"Title: {request.title}",
            f"Tagline: {request.tagline}" if request.tagline else "",
            f"Points: {', '.join(request.points[:5])}" if request.points else "",
            f"Language: {request.language}" if request.language else "",
            f"Topics: {', '.join(request.topics[:5])}" if request.topics else "",
            f"Stats: {request.stats}" if request.stats else "",
            f"Summary: {request.summary}" if request.summary else "",
            f"Assets: {len(request.extracted_videos)} videos, {len(request.images)} images, {len(request.scroll_videos)} scroll recordings",
            f"Demo-heavy: {'yes' if request.is_demo_heavy else 'no'}",
            f"Target duration: {request.total_duration}s",
        ]
        return "\n".join(p for p in parts if p)

    def _llm_match(self, request: MatchingRequest) -> dict:
        """Call LLM with structured prompt, parse JSON response."""
        system = SYSTEM_PROMPT.format(**self.catalog)
        user = self._build_user_prompt(request)

        if self.provider == "deepseek":
            return self._call_deepseek(system, user)
        else:
            return self._call_openai_compatible(system, user)

    def _call_deepseek(self, system: str, user: str) -> dict:
        """Call DeepSeek API."""
        import urllib.request
        import urllib.error

        url = "https://api.deepseek.com/v1/chat/completions"
        body = json.dumps({
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.3,
            "max_tokens": 4096,
            "response_format": {"type": "json_object"},
        }).encode("utf-8")

        req = urllib.request.Request(url, data=body, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        })

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read())
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            raise RuntimeError(f"DeepSeek API error {e.code}: {error_body}")

    def _call_openai_compatible(self, system: str, user: str) -> dict:
        """Call OpenAI-compatible API."""
        import urllib.request
        import urllib.error

        url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions")
        body = json.dumps({
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.3,
            "max_tokens": 4096,
            "response_format": {"type": "json_object"},
        }).encode("utf-8")

        req = urllib.request.Request(url, data=body, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        })

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read())
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            raise RuntimeError(f"API error {e.code}: {error_body}")

    def _validate_and_fix(self, result: dict) -> MatchingResult:
        """Validate LLM output against known-good values, fix simple errors."""
        valid_structures = {"funnel", "timeline", "product-showcase", "performance-launch"}
        valid_styles = set(STYLE_TO_BG.keys())

        valid_layouts = set()
        for info in LAYOUT_CATALOG.values():
            valid_layouts.add(info["primary"])
            valid_layouts.update(info["alternatives"])

        valid_motions = {
            "none", "fade-in", "fade-out", "fade-up", "fade-down",
            "scale-in", "scale-bounce",
            "slide-left", "slide-right", "slide-up", "slide-down",
            "bar-grow", "typewriter",
        }
        valid_motions.update({"spring-slide-up", "staggered-grow", "subtle-float", "glow-pulse"})

        valid_bg_types = {
            "dark-neon", "fluid-aurora", "light-beam", "tech-overlay",
            "aurora-bg", "fluid-background", "noise-background",
            "dot-grid-bg", "none",
        }

        # Validate structureId
        structure_id = result.get("structureId", "funnel")
        if structure_id not in valid_structures:
            print(f"  [LLMMatcher] Invalid structureId '{structure_id}', using 'funnel'")
            structure_id = "funnel"

        # Validate styleId
        style_id = result.get("styleId", "dark-purple")
        if style_id not in valid_styles:
            print(f"  [LLMMatcher] Invalid styleId '{style_id}', using 'dark-purple'")
            style_id = "dark-purple"

        # Validate bgType
        bg_type = result.get("bgType", "dark-neon")
        if bg_type not in valid_bg_types:
            print(f"  [LLMMatcher] Invalid bgType '{bg_type}', using 'dark-neon'")
            bg_type = "dark-neon"

        # Validate and fix sceneConfigs
        scene_configs = result.get("sceneConfigs", {})
        fixed_configs = {}
        for scene_id, scene in scene_configs.items():
            layout_id = scene.get("layoutId", "hero-center")
            if layout_id not in valid_layouts:
                layout_id = "hero-center"

            motion_map = scene.get("motionMap", {})
            fixed_motions = {}
            for role, motion in motion_map.items():
                if motion in valid_motions:
                    fixed_motions[role] = motion
                else:
                    # Use default for that role
                    defaults = {"title": "scale-bounce", "headline": "scale-bounce",
                                "subtitle": "fade-up", "points": "fade-up",
                                "stats": "scale-in", "url": "fade-up"}
                    fixed_motions[role] = defaults.get(role, "scale-fade")

            fixed_configs[scene_id] = {
                "layoutId": layout_id,
                "motionMap": fixed_motions,
                "content": scene.get("content", {}),
            }

        return MatchingResult(
            structure_id=structure_id,
            style_id=style_id,
            bg_type=bg_type,
            scene_configs=fixed_configs,
            reasoning=result.get("reasoning", ""),
        )

    def _rule_based_match(self, request: MatchingRequest) -> MatchingResult:
        """Deterministic fallback — mirrors matching.ts logic."""
        # Structure
        video_count = len(request.extracted_videos) + len(request.link_videos)
        if video_count >= 3:
            structure_id = "product-showcase"
        else:
            structure_id = "funnel"

        # Style
        lang = request.language.lower()
        lang_map = {
            "python": "tech-grid", "rust": "matte-metal", "go": "dark-purple",
            "javascript": "sakura-pink", "typescript": "sakura-pink",
            "java": "dark-purple", "c++": "tech-grid", "c": "matte-metal",
            "ruby": "warm-orange", "swift": "neon-blue", "kotlin": "dark-purple",
        }
        style_id = lang_map.get(lang, "dark-purple")

        # bgType from STYLE_TO_BG
        bg_type = STYLE_TO_BG.get(style_id, {}).get("bgType", "dark-neon")

        # Scene configs (simple defaults)
        scene_configs = {}
        structure_scenes = {
            "funnel": ["hook", "problem", "solution", "showcase", "features", "cta"],
            "product-showcase": ["hook", "problem", "demo", "features", "proof", "cta"],
        }
        for sid in structure_scenes.get(structure_id, ["hook", "cta"]):
            scene_configs[sid] = {
                "layoutId": LAYOUT_CATALOG.get(sid, {}).get("primary", "hero-center"),
                "motionMap": {},
                "content": {},
            }

        # Fill content from request
        if "hook" in scene_configs:
            scene_configs["hook"]["content"] = {"headline": request.title}
            scene_configs["hook"]["motionMap"] = {"headline": "scale-bounce"}
        if "cta" in scene_configs:
            scene_configs["cta"]["content"] = {
                "title": request.url or request.title,
                **({"stats": request.stats} if request.stats else {}),
            }

        return MatchingResult(
            structure_id=structure_id,
            style_id=style_id,
            bg_type=bg_type,
            scene_configs=scene_configs,
            reasoning="Rule-based fallback (no LLM used)",
        )


# ── Convenience function for allocate.py integration ──

def build_video_config_with_llm(
    info: dict,
    repo_url: str,
    bg_type: str = "starfield",
    style_id: Optional[str] = None,
    structure_id: Optional[str] = None,
    api_key: Optional[str] = None,
    provider: str = "deepseek",
) -> dict:
    """Build a complete VideoConfig dict using LLM matching.

    Falls back to rule-based matching if LLM is unavailable.
    Args match the signature of allocate.py's existing build_video_config().
    """
    request = MatchingRequest(
        title=info.get("title", repo_url.rstrip("/").split("/")[-1]),
        tagline=info.get("tagline", ""),
        points=info.get("points", []),
        summary=info.get("summary", ""),
        url=info.get("url", repo_url),
        stats=info.get("stats", ""),
        language=info.get("language", ""),
        topics=info.get("topics", []),
        extracted_videos=info.get("extractedVideos", []),
        images=info.get("images", []),
        scroll_videos=info.get("scrollVideos", []),
        link_videos=info.get("linkVideos", []),
        is_demo_heavy=len(info.get("extractedVideos", [])) >= 3,
        total_duration=info.get("total_duration", 180),
    )

    matcher = LLMMatcher(api_key=api_key, provider=provider)
    result = matcher.match(request)

    # Build full VideoConfig
    config = {
        "structureId": result.structure_id,
        "styleId": result.style_id,
        "bgType": result.bg_type,
        "sceneConfigs": result.scene_configs,
        "audio": {
            "bgm": {"mood": "tech", "src": "audio/bgm/tech-pulse.mp3"},
            "sfxEnabled": True,
            "voiceover": [],
            "voiceoverEnabled": False,
        },
    }

    # Add transition defaults
    scene_ids = list(config["sceneConfigs"].keys())
    for i, sid in enumerate(scene_ids):
        scene = config["sceneConfigs"][sid]
        is_first = i == 0
        is_last = i == len(scene_ids) - 1
        if not is_first and "transitionIn" not in scene:
            scene["transitionIn"] = {"type": "crossfade", "durationFrames": 15}
        if not is_last and "transitionOut" not in scene:
            scene["transitionOut"] = {"type": "crossfade", "durationFrames": 15}

    print(f"  [LLMMatcher] structure={result.structure_id}, style={result.style_id}, bg={result.bg_type}")
    if result.reasoning:
        print(f"  [LLMMatcher] reasoning: {result.reasoning}")

    return config
