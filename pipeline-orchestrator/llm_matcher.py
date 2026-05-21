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
    "hook":       {"primary": "hero-center", "alternatives": ["kinetic-typography", "media-full"]},
    "problem":    {"primary": "hero-center", "alternatives": ["split-left-text", "quote-style"]},
    "solution":   {"primary": "split-left-text", "alternatives": ["hero-center", "card-grid"]},
    "feature":    {"primary": "card-grid", "alternatives": ["hero-center", "floating-grid"]},
    "showcase":   {"primary": "media-full", "alternatives": ["center-focus-video", "fly-through"]},
    "proof":      {"primary": "stat-highlight", "alternatives": ["card-grid", "quote-style"]},
    "cta":        {"primary": "hero-center", "alternatives": ["prompt-input"]},
    "demo":       {"primary": "media-full", "alternatives": ["center-focus-video"]},
    "origin":     {"primary": "hero-center", "alternatives": ["split-left-text"]},
    "milestones": {"primary": "card-grid", "alternatives": ["floating-grid"]},
    "today":      {"primary": "stat-highlight", "alternatives": ["hero-center"]},
}

MOTION_CATALOG = {
    "title":    {"primary": "arc-entrance", "alternatives": ["spring-elastic", "bounce-in"]},
    "subtitle": {"primary": "scale-fade", "alternatives": ["smooth-scale-up"]},
    "points":   {"primary": "spring-slide-up", "alternatives": ["staggered-grow"]},
    "headline": {"primary": "bounce-in", "alternatives": ["arc-entrance", "spring-elastic"]},
    "stats":    {"primary": "scale-fade", "alternatives": ["spring-slide-up"]},
}

# ── Prompt template ──

SYSTEM_PROMPT = """You are a video template matching agent for a programmatic video rendering engine. Given a GitHub repository's metadata and content, select the optimal structure, style, layout, and motion templates for a promo video.

## Available Structure Templates
{structures}

## Available Style Templates (by family)
{styles}

## Available Layout Types (by scene)
{layouts}

## Available Motion Types (by element role)
{motions}

## Output Format
Return a JSON object with this exact structure:
{{
  "structureId": "funnel",
  "styleId": "dark-purple",
  "bgType": "starfield",
  "reasoning": "Brief explanation of your choices (1-2 sentences)",
  "sceneConfigs": {{
    "hook": {{
      "layoutId": "hero-center",
      "motionMap": {{ "headline": "bounce-in" }}
    }},
    "problem": {{
      "layoutId": "hero-center",
      "motionMap": {{ "title": "arc-entrance", "points": "spring-slide-up" }}
    }}
    // ... one entry per scene in the chosen structure
  }}
}}

## Selection Rules
1. **Structure**: Use "product-showcase" if there are 3+ videos/GIFs. Use "funnel" as default.
2. **Style**: Match to the project's primary programming language and topics. Tech languages → "tech" family. Creative/frontend → "creative" family. CLI/tools → "minimal".
3. **Layout**: Each scene type has a primary and alternative layout. Choose based on content density.
   - hook/problem/cta → hero-center (single big message)
   - solution/feature → split-left-text or card-grid (info-rich)
   - showcase → media-full (let visuals speak)
   - proof → stat-highlight (numbers need to pop)
4. **Motion**: Title/headline → arc-entrance or bounce-in for impact. Points → spring-slide-up with stagger for list reveal. Stats → scale-fade for elegance.
5. **bgType**: Match to the chosen style family (tech → starfield, creative → fluid-gradient, minimal → bokeh, business → geometric, playful → fluid-gradient).

## Constraints
- All layoutId values must be from the Available Layout Types list.
- All motion values must be from the Available Motion Types list.
- styleId must be a valid style ID from the catalog.
- structureId must be one of: funnel, timeline, product-showcase, performance-launch.
- Do NOT invent new layout or motion names — use ONLY what's listed."""


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
        valid_styles = {
            "dark-purple", "sakura-pink", "neon-blue", "warm-orange",
            "deep-green", "matte-metal", "ocean-cyan", "tech-grid",
            "paper-light", "ink-dark", "corporate-gray", "retro-warm",
        }
        valid_layouts = set(LAYOUT_CATALOG.keys())
        # All layout IDs from catalog values
        for info in LAYOUT_CATALOG.values():
            valid_layouts.add(info["primary"])
            valid_layouts.update(info["alternatives"])
        # add layout IDs not in scene-type catalog
        valid_layouts.update({"code-display", "sandwich-text", "quote-style", "full-screen-text", "split-right-text"})

        valid_motions = set()
        for info in MOTION_CATALOG.values():
            valid_motions.add(info["primary"])
            valid_motions.update(info["alternatives"])
        # Add all defined motion types
        valid_motions.update({
            "spring-slide-up", "spring-slide-left", "arc-entrance", "scale-fade",
            "typewriter", "reveal-mask", "bounce-in", "blur-focus",
            "spring-elastic", "smooth-scale-up", "staggered-grow",
            "fade-out", "slide-out-left", "scale-down-out", "blur-out",
            "subtle-float", "glow-pulse", "none",
        })

        valid_bg_types = {"starfield", "bokeh", "geometric", "pixel", "fluid-gradient", "none"}

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
        bg_type = result.get("bgType", "starfield")
        if bg_type not in valid_bg_types:
            print(f"  [LLMMatcher] Invalid bgType '{bg_type}', using 'starfield'")
            bg_type = "starfield"

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
                    defaults = {"title": "arc-entrance", "headline": "bounce-in",
                                "subtitle": "scale-fade", "points": "spring-slide-up",
                                "stats": "scale-fade", "url": "spring-slide-up"}
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

        # bgType from style family
        family_bg = {"dark-purple": "starfield", "tech-grid": "starfield", "neon-blue": "starfield",
                     "corporate-gray": "geometric", "ink-dark": "geometric", "paper-light": "geometric",
                     "sakura-pink": "fluid-gradient", "ocean-cyan": "fluid-gradient",
                     "matte-metal": "bokeh",
                     "warm-orange": "fluid-gradient", "warm-yellow": "fluid-gradient", "retro-warm": "fluid-gradient"}
        bg_type = family_bg.get(style_id, "starfield")

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
            scene_configs["hook"]["motionMap"] = {"headline": "bounce-in"}
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
