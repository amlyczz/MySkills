#!/usr/bin/env python3
"""
allocate.py (v4) — Phase 1: 素材清单加载与验证

职责:
  1. 委托 manifest_validator 完成素材清单加载与验证
  2. 提供 build_video_config() 向后兼容
  3. 不再渲染 intro/outro（组件已删除，无 fallback）
  4. 不再写入 video_config.json（由 Phase 2 timeline_composer 唯一产出）

Usage:
    python3 allocate.py <manifest> <total_duration> [--output-dir DIR]
                       [--content-dir DIR] [--bg-type TYPE] [--strict]
"""

import json
import sys
import os
import argparse

from manifest_validator import validate_manifest, MATERIAL_TYPE_ENUM


# ── VideoComposer config (backward compat, kept but no longer used in pipeline) ──

def build_video_config(info, repo_url, bg_type='starfield', style_id=None, structure_id=None):
    """Build a VideoConfig JSON using rule-based matching. (backward compat)

    Uses the content info to select style, layout, and motion for each scene.
    NOTE: video_config.json 由 timeline_composer.py 唯一产出，此函数仅供外部调用。
    """
    valid_style_ids = {
        'dark-purple', 'sakura-pink', 'neon-blue', 'warm-orange',
        'deep-green', 'matte-metal', 'ocean-cyan', 'tech-grid',
        'paper-light', 'ink-dark', 'corporate-gray', 'retro-warm',
    }

    if style_id:
        if style_id not in valid_style_ids:
            print(f"  WARNING: style '{style_id}' not found, using auto-match")
            style_id = None

    if not style_id:
        language = info.get('language', '').lower()
        style_id = 'dark-purple'
        lang_map = {
            'python': 'tech-grid', 'rust': 'matte-metal', 'go': 'dark-purple',
            'javascript': 'sakura-pink', 'typescript': 'sakura-pink',
            'css': 'sakura-pink', 'html': 'sakura-pink',
            'java': 'dark-purple', 'c++': 'tech-grid', 'c': 'matte-metal',
            'ruby': 'warm-orange', 'swift': 'neon-blue', 'kotlin': 'dark-purple',
        }
        style_id = lang_map.get(language, 'dark-purple')

    title = info.get('title', repo_url.rstrip('/').split('/')[-1])
    tagline = info.get('tagline', '')
    points = info.get('points', [])
    url = info.get('url', repo_url)
    stats = info.get('stats', '')
    summary = info.get('summary', '')

    valid_structure_ids = {'funnel', 'timeline', 'product-showcase', 'performance-launch'}
    if structure_id and structure_id not in valid_structure_ids:
        print(f"  WARNING: structure '{structure_id}' not found, using auto-match")
        structure_id = None
    if not structure_id:
        structure_id = 'funnel'

    config = {
        "structureId": structure_id,
        "styleId": style_id,
        "bgType": bg_type,
        "sceneConfigs": {
            "hook": {
                "layoutId": "hero-center",
                "motionMap": {"headline": "bounce-in"},
                "content": {"headline": title},
            },
            "problem": {
                "layoutId": "hero-center",
                "motionMap": {},
                "content": {
                    "title": "Why This Matters",
                    "points": [f"• {p}" for p in points[:3]] if points else [],
                },
            },
            "solution": {
                "layoutId": "hero-center",
                "motionMap": {},
                "content": {
                    "title": title,
                    **({"subtitle": tagline} if tagline else {}),
                },
            },
            "showcase": {
                "layoutId": "media-full",
                "motionMap": {},
                "content": {},
            },
            "features": {
                "layoutId": "hero-center",
                "motionMap": {},
                "content": {
                    "title": "Key Features",
                    "points": points[:5] if points else [],
                },
            },
            "proof": {
                "layoutId": "stat-highlight",
                "motionMap": {"title": "spring-elastic"},
                "content": {
                    "title": "Performance",
                    "points": [f"• {p}" for p in points[:2]] if points else [],
                },
                **({"chartData": info.get('chartData', [])} if info.get('chartData') else {}),
            },
            "proof-1": {
                "layoutId": "stat-highlight",
                "motionMap": {"title": "spring-elastic"},
                "content": {"title": "Performance"},
                **({"chartData": info.get('chartData', [])[:2] if len(info.get('chartData', [])) >= 2 else info.get('chartData', [])} if info.get('chartData') else {}),
            },
            "proof-2": {
                "layoutId": "stat-highlight",
                "motionMap": {"title": "spring-elastic"},
                "content": {"title": "Performance"},
                **({"chartData": info.get('chartData', [])[2:4] if len(info.get('chartData', [])) >= 4 else info.get('chartData', [])} if info.get('chartData') else {}),
            },
            "cta": {
                "layoutId": "hero-center",
                "motionMap": {},
                "content": {
                    "title": url,
                    **({"stats": stats} if stats else {}),
                    **({"summary": summary} if summary else {}),
                },
            },
        },
        "audio": {
            "sfxEnabled": True,
            "voiceover": [],
            "voiceoverEnabled": False,
        },
    }

    scene_ids = list(config["sceneConfigs"].keys())
    for i, sid in enumerate(scene_ids):
        scene = config["sceneConfigs"][sid]
        is_first = i == 0
        is_last = i == len(scene_ids) - 1
        if not is_first and "transitionIn" not in scene:
            scene["transitionIn"] = {"type": "crossfade", "durationFrames": 15}
        if not is_last and "transitionOut" not in scene:
            scene["transitionOut"] = {"type": "crossfade", "durationFrames": 15}

    return config


# ── Entry point ────────────────────────────────────────────


def allocate(manifest_path, total_time, output_dir, content_dir=None, repo_url=None, bg_type='starfield', strict=False, manual_images=None, manual_videos=None):
    """Phase 1 entry: validate material manifest only."""
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    with open(manifest_path) as f:
        data = json.load(f)

    # Schema validation (delegated to manifest_validator)
    valid, errors, manifest = validate_manifest(data, strict=strict)
    for e in errors:
        print(f"  WARNING: {e}")
    if not valid and strict:
        print("ERROR: Manifest validation failed in --strict mode. Aborting.")
        sys.exit(1)
    if not manifest:
        print("ERROR: No valid manifest entries found. Aborting.")
        sys.exit(1)

    print(f"\nLoaded manifest: {len(manifest)} entries (v{data.get('version', 'legacy') if isinstance(data, dict) else 'legacy'})")


# ── CLI ─────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Phase 1: Validate material manifest')
    parser.add_argument('manifest', help='Path to manifest_full.json')
    parser.add_argument('total_duration', type=float, help='Target total duration in seconds')
    parser.add_argument('--output-dir', default='./output', help='Output directory')
    parser.add_argument('--content-dir', default=None, help='Content directory with repo archive and script')
    parser.add_argument('--repo-url', default=None, help='Repository URL')
    parser.add_argument('--bg-type', default='starfield',
                        choices=['starfield', 'bokeh', 'geometric', 'pixel'],
                        help='Background animation type (default: starfield)')
    parser.add_argument('--strict', action='store_true',
                        help='Enable strict manifest schema validation')
    parser.add_argument('--srt', default=None,
                        help='Path to SRT subtitle file (deprecated, Phase 4 handles this)')
    parser.add_argument('--manual-image', default=None, action='append',
                        help='User-provided image file path (repeatable)')
    parser.add_argument('--manual-video', default=None, action='append',
                        help='User-provided video file path (repeatable)')

    args = parser.parse_args()
    allocate(args.manifest, args.total_duration, args.output_dir, args.content_dir, args.repo_url, args.bg_type,
             strict=args.strict,
             manual_images=args.manual_image, manual_videos=args.manual_video)
