#!/usr/bin/env python3
"""
allocate.py (v2) — 时间分配 + 素材编排 + VideoConfig 构建

职责：素材清单加载与验证、按 structure 模板分配场景时长、
      build_video_config() 构建 VideoConfig、调用 render.py 渲染。

Usage:
    python3 allocate.py <manifest> <total_duration> [--output-dir DIR]
                       [--content-dir DIR] [--bg-type TYPE] [--strict]
"""

import json
import sys
import os
import re
import subprocess
import argparse
import random
from typing import Optional

from pydantic import BaseModel, Field

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REMOTION_DIR = os.path.join(REPO_ROOT, "video-renderer", "remotion")

# Load shared render module
sys.path.insert(0, os.path.join(REPO_ROOT, "video-renderer", "scripts"))
import render
# Load post-producer subtitle module
sys.path.insert(0, os.path.join(REPO_ROOT, "post-producer", "scripts"))
from audio_mixer import burn_subtitles

random.seed()

# ── Manifest Schema ──────────────────────────────────────────

MANIFEST_SCHEMA = {
    "$schema": "https://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["version", "entries"],
    "properties": {
        "version": {"type": "string", "enum": ["1"]},
        "$schema": {"type": "string"},
        "createdAt": {"type": "string", "format": "date-time"},
        "repoUrl": {"type": "string", "format": "uri"},
        "entries": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["type", "path"],
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["scroll_video", "extracted_video", "image", "link_video"],
                    },
                    "path": {"type": "string"},
                    "duration": {"type": "number"},
                    "sourceUrl": {"type": "string"},
                    "label": {"type": "string"},
                    "fileSize": {"type": "number"},
                },
            },
        },
    },
}


class ManifestEntry(BaseModel):
    """单个素材条目的数据契约。"""
    type: str          # scroll_video | extracted_video | image | link_video
    path: str          # 相对路径
    duration: float = 0.0
    sourceUrl: str = ""
    label: str = ""
    fileSize: float = 0.0


class Manifest(BaseModel):
    """完整 manifest 的数据契约。"""
    version: str = "1"
    schema_ref: str = Field(default="manifest-full-schema.json", alias="$schema")
    createdAt: str = ""
    repoUrl: str = ""
    entries: list[ManifestEntry] = Field(default_factory=list)


def validate_manifest(data, strict=False):
    """Validate manifest data against schema. Returns (is_valid, errors, entries_list).

    Accepts both:
      - new format: {"version": "1", "entries": [...]}
      - old format: [...]  (array-only, no version field)
    """
    errors = []

    # Case 1: array-only format (backward compat)
    if isinstance(data, list):
        if strict:
            errors.append("--strict mode: array-only manifest not accepted (missing version/entries wrapper)")
            return False, errors, []
        # Validate each entry minimally
        valid_entries = []
        for i, item in enumerate(data):
            if not isinstance(item, dict):
                errors.append(f"Entry {i}: not an object")
                continue
            if 'type' not in item or 'path' not in item:
                errors.append(f"Entry {i}: missing 'type' or 'path'")
                continue
            if item.get('type') not in ('scroll_video', 'extracted_video', 'image', 'link_video'):
                errors.append(f"Entry {i}: unknown type '{item.get('type')}'")
                continue
            valid_entries.append(item)
        if errors:
            return False, errors, valid_entries
        return True, [], valid_entries

    # Case 2: new structured format
    if not isinstance(data, dict):
        errors.append("Manifest must be an object or array")
        return False, errors, []

    if 'version' not in data:
        errors.append("Missing 'version' field")
        if strict:
            return False, errors, []
    elif data.get('version') != '1':
        errors.append(f"Unsupported manifest version: {data.get('version')} (expected '1')")
        if strict:
            return False, errors, []

    entries = data.get('entries', [])
    if not isinstance(entries, list):
        errors.append("'entries' must be an array")
        return False, errors, []

    valid_entries = []
    for i, item in enumerate(entries):
        if not isinstance(item, dict):
            errors.append(f"Entry {i}: not an object")
            continue
        if 'type' not in item:
            errors.append(f"Entry {i}: missing 'type'")
            continue
        if 'path' not in item:
            errors.append(f"Entry {i}: missing 'path'")
            continue
        if item.get('type') not in ('scroll_video', 'extracted_video', 'image', 'link_video'):
            errors.append(f"Entry {i}: unknown type '{item.get('type')}'")
            continue
        valid_entries.append(item)

    if errors:
        return False, errors, valid_entries
    return True, [], valid_entries


# ── Helper: strip markdown formatting ──────────────────────
def strip_md(text):
    """Remove markdown bold/italic markers from text."""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    return text

# ── Read content ───────────────────────────────────────────

def info_dict_from_json(data):
    """Map content.json data to the legacy info dict used by build_video_config() etc.

    Keys produced (must match the original markdown path exactly):
      title, tagline, points, url, stats, summary, outro_extra, domains, language
    """
    repo = data.get('repo', {})
    content = data.get('content', {})
    script = data.get('script', {})

    info = {
        'title': content.get('title', repo.get('full_name', '').split('/')[-1]),
        'tagline': content.get('tagline', ''),
        'points': content.get('points', []),
        'url': repo.get('url', ''),
        'stats': content.get('stats_text', ''),
        'summary': '',
        'outro_extra': '',
        'domains': content.get('domains', ''),
        'language': repo.get('language', ''),
        'chartData': content.get('chartData', []),
    }

    # Derive summary / outro_extra from script segments (mirrors markdown logic)
    segments = script.get('segments', [])
    if segments:
        segment_texts = [s['text'] for s in segments]
        if len(segment_texts) >= 2:
            last_two = segment_texts[-2:]
            info['summary'] = ('。'.join(last_two) + '。')[:300]
        elif segment_texts:
            info['summary'] = (segment_texts[0] + '。')[:300]
        if len(segment_texts) >= 4:
            info['outro_extra'] = segment_texts[len(segment_texts)//2][:200]
    elif script.get('full_text'):
        sentences = re.split(r'[。！？]', script['full_text'])
        sentences = [s.strip() for s in sentences if s.strip()]
        last_two = sentences[-2:] if len(sentences) >= 2 else sentences[-1:]
        info['summary'] = ('。'.join(last_two) + '。')[:300]
        if len(sentences) >= 4:
            info['outro_extra'] = sentences[len(sentences)//2][:200]

    return info


def read_content_markdown(content_dir, repo_name):
    """Fallback: parse repo archive + script from markdown files."""
    info = {'title': repo_name, 'tagline': '', 'points': [], 'summary': '', 'outro_extra': '', 'stats': ''}

    for fname in os.listdir(content_dir):
        if fname.endswith('.md') and repo_name in fname and '口播' not in fname and '封面' not in fname and '发布' not in fname:
            fpath = os.path.join(content_dir, fname)
            with open(fpath, 'r') as f:
                content = f.read()
            m = re.search(r'\*\*一句话定位\*\*：(.+)', content)
            if m:
                info['tagline'] = strip_md(m.group(1).strip())
            m = re.search(r'\*\*GitHub 地址\*\*：(.+)', content)
            if m:
                info['url'] = m.group(1).strip()
            m = re.search(r'\*\*Star 总数\*\*：(.+)', content)
            if m:
                info['stats'] = strip_md(m.group(1).strip())
            points = re.findall(r'^\s*\d+\.\s+(.+)', content, re.MULTILINE)
            if points:
                info['points'] = [strip_md(p) for p in points[:5]]
            m = re.search(r'\*\*使用领域标签\*\*：(.+)', content)
            if m:
                info['domains'] = strip_md(m.group(1).strip())
            m = re.search(r'\*\*目标用户\*\*：(.+)', content)
            if m:
                info['target_users'] = strip_md(m.group(1).strip())
            m = re.search(r'\*\*编程语言\*\*：(.+)', content)
            if m:
                info['language'] = strip_md(m.group(1).strip())
            break

    for fname in os.listdir(content_dir):
        if fname.endswith('.md') and repo_name in fname and '口播' in fname:
            fpath = os.path.join(content_dir, fname)
            with open(fpath, 'r') as f:
                content = f.read()
            lines = content.strip().split('\n')
            text_lines = [l.strip() for l in lines if l.strip() and not l.startswith('#') and not l.startswith('<!--')]
            if text_lines:
                full_text = '。'.join(l.rstrip('。') for l in text_lines)
                sentences = re.split(r'[。！？]', full_text)
                sentences = [s.strip() for s in sentences if s.strip()]
                last_two = sentences[-2:] if len(sentences) >= 2 else sentences[-1:]
                info['summary'] = ('。'.join(last_two) + '。')[:300]
                if len(sentences) >= 4:
                    info['outro_extra'] = sentences[len(sentences)//2][:200]
            break

    return info


def read_content(content_dir, repo_name):
    """Read repo archive and script from content directory.

    Priority: content.json (if present) → markdown fallback.
    """
    info = {'title': repo_name, 'tagline': '', 'points': [], 'summary': '', 'outro_extra': '', 'stats': ''}

    content_json_path = os.path.join(content_dir, 'content.json')
    if os.path.isfile(content_json_path):
        with open(content_json_path, 'r') as f:
            data = json.load(f)
        return info_dict_from_json(data)
    else:
        return read_content_markdown(content_dir, repo_name)


def generate_simple_info(repo_url):
    """Generate minimal info from URL alone."""
    repo_name = repo_url.rstrip('/').split('/')[-1]
    return {
        'title': repo_name,
        'tagline': repo_url,
        'points': [],
        'summary': '',
        'outro_extra': '',
        'stats': '',
        'url': repo_url,
        'domains': '',
        'language': '',
    }


def render_intro_outro_with_degradation(output_dir, info, repo_name, repo_url,
                                         theme_index, bg_type, intro_duration, outro_duration):
    """Render intro/outro with 4-tier degradation chain.

    级别 0: 完整 Remotion（内容+动画+背景）
    级别 1: 简化 Remotion（仅标题+URL，无要点列表，有背景）
    级别 2: 静态纯色（ffmpeg，无内容）
    级别 3: 纯黑兜底（ffmpeg）
    """
    intro_result = {'level': 3, 'path': None}
    outro_result = {'level': 3, 'path': None}
    intro_mp4 = os.path.join(output_dir, 'intro.mp4')
    outro_mp4 = os.path.join(output_dir, 'outro.mp4')

    # ── Level 0: Full Remotion ──
    intro_props_v0 = {
        "title": info.get('title', repo_name),
        "tagline": info.get('tagline', ''),
        "points": info.get('points', []),
        "themeIndex": theme_index,
        "bgType": bg_type,
    }
    outro_props_v0 = {
        "url": info.get('url', repo_url),
        "stats": info.get('stats', ''),
        "summary": info.get('summary', ''),
        "themeIndex": theme_index,
        "bgType": bg_type,
    }
    print(f"\n  [L0] Rendering intro with full Remotion (theme: {theme_index}, bg: {bg_type})...")
    if render.remotion_render('Intro', intro_mp4, intro_props_v0, cwd=REMOTION_DIR):
        intro_result = {'level': 0, 'path': intro_mp4}
        print(f"  [L0] Intro done")
    else:
        print(f"  [L0] Failed, trying L1 (simplified Remotion)...")
        # ── Level 1: Simplified Remotion (no points, shorter durations) ──
        intro_props_v1 = {
            "title": info.get('title', repo_name),
            "tagline": info.get('tagline', ''),
            "points": [],  # no points
            "themeIndex": theme_index,
            "bgType": bg_type,
        }
        print(f"  [L1] Rendering intro with simplified Remotion...")
        if render.remotion_render('Intro', intro_mp4, intro_props_v1, cwd=REMOTION_DIR):
            intro_result = {'level': 1, 'path': intro_mp4}
            print(f"  [L1] Intro done")
        else:
            print(f"  [L1] Failed, trying L2 (static color)...")
            # ── Level 2: Static solid color ──
            try:
                solid_color = '#1a1a2e'  # dark navy, visually better than pure black
                subprocess.run([
                    'ffmpeg', '-y', '-f', 'lavfi',
                    '-i', f'color=c={solid_color}:s=1920x1080:d={intro_duration}',
                    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
                    intro_mp4
                ], check=True, capture_output=True, timeout=30)
                intro_result = {'level': 2, 'path': intro_mp4}
                print(f"  [L2] Intro done (solid color)")
            except Exception:
                print(f"  [L2] Failed, trying L3 (black fallback)...")
                # ── Level 3: Pure black fallback ──
                try:
                    subprocess.run([
                        'ffmpeg', '-y', '-f', 'lavfi',
                        '-i', f'color=c=black:s=1920x1080:d={intro_duration}',
                        '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
                        intro_mp4
                    ], check=True, capture_output=True, timeout=30)
                    intro_result = {'level': 3, 'path': intro_mp4}
                    print(f"  [L3] Intro done (black fallback)")
                except Exception as e:
                    print(f"  ERROR: All intro render levels failed: {e}")

    # ── Outro ──
    outro_parts = []
    if info.get('summary'):
        outro_parts.append(info['summary'])
    if info.get('outro_extra'):
        outro_parts.append(info['outro_extra'])
    if info.get('domains'):
        outro_parts.append(f"适用领域：{info['domains']}")
    if info.get('language'):
        outro_parts.append(f"主要语言：{info['language']}")
    outro_summary = '\n'.join(outro_parts[:3])

    print(f"\n  [L0] Rendering outro with full Remotion...")
    if render.remotion_render('Outro', outro_mp4, outro_props_v0, cwd=REMOTION_DIR):
        outro_result = {'level': 0, 'path': outro_mp4}
        print(f"  [L0] Outro done")
    else:
        print(f"  [L0] Failed, trying L1 (simplified Remotion)...")
        outro_props_v1 = {
            "url": info.get('url', repo_url),
            "stats": info.get('stats', ''),
            "summary": '',
            "themeIndex": theme_index,
            "bgType": bg_type,
        }
        print(f"  [L1] Rendering outro with simplified Remotion...")
        if render.remotion_render('Outro', outro_mp4, outro_props_v1, cwd=REMOTION_DIR):
            outro_result = {'level': 1, 'path': outro_mp4}
            print(f"  [L1] Outro done")
        else:
            print(f"  [L1] Failed, trying L2 (static color)...")
            try:
                solid_color = '#1a1a2e'
                subprocess.run([
                    'ffmpeg', '-y', '-f', 'lavfi',
                    '-i', f'color=c={solid_color}:s=1920x1080:d={outro_duration}',
                    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
                    outro_mp4
                ], check=True, capture_output=True, timeout=30)
                outro_result = {'level': 2, 'path': outro_mp4}
                print(f"  [L2] Outro done (solid color)")
            except Exception:
                print(f"  [L2] Failed, trying L3 (black fallback)...")
                try:
                    subprocess.run([
                        'ffmpeg', '-y', '-f', 'lavfi',
                        '-i', f'color=c=black:s=1920x1080:d={outro_duration}',
                        '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
                        outro_mp4
                    ], check=True, capture_output=True, timeout=30)
                    outro_result = {'level': 3, 'path': outro_mp4}
                    print(f"  [L3] Outro done (black fallback)")
                except Exception as e:
                    print(f"  ERROR: All outro render levels failed: {e}")

    print(f"\n  Intro degradation level: L{intro_result['level']}")
    print(f"  Outro degradation level: L{outro_result['level']}")
    return intro_result, outro_result


def generate_intro_outro(output_dir, content_dir, repo_url, bg_type='starfield'):
    """Generate intro.mp4 and outro.mp4 using Remotion render with degradation chain."""
    repo_name = repo_url.rstrip('/').split('/')[-1]

    # Gather content
    if content_dir and os.path.isdir(content_dir):
        info = read_content(content_dir, repo_name)
    else:
        info = generate_simple_info(repo_url)

    # Random theme selection
    theme_index = random.randint(0, 11)
    intro_duration = 10
    outro_duration = 10

    print(f"\nGenerating intro/outro (theme: {theme_index}, bg: {bg_type})...")
    intro_result, outro_result = render_intro_outro_with_degradation(
        output_dir, info, repo_name, repo_url,
        theme_index, bg_type, intro_duration, outro_duration
    )
    return intro_result, outro_result, info


# ── VideoComposer rendering ──────────────────────────────────

def build_video_config(info, repo_url, bg_type='starfield', style_id=None, structure_id=None):
    """Build a VideoConfig JSON using rule-based matching.

    Uses the content info to select style, layout, and motion for each scene.
    """
    # Valid style IDs (must match styles.ts)
    valid_style_ids = {
        'dark-purple', 'sakura-pink', 'neon-blue', 'warm-orange',
        'deep-green', 'matte-metal', 'ocean-cyan', 'tech-grid',
        'paper-light', 'ink-dark', 'corporate-gray', 'retro-warm',
    }

    # Style selection
    if style_id:
        if style_id not in valid_style_ids:
            print(f"  WARNING: style '{style_id}' not found, using auto-match")
            style_id = None

    if not style_id:
        # Simple language-based matching (mirrors styleMeta.ts logic)
        language = info.get('language', '').lower()
        style_id = 'dark-purple'  # default
        lang_map = {
            'python': 'tech-grid', 'rust': 'matte-metal', 'go': 'dark-purple',
            'javascript': 'sakura-pink', 'typescript': 'sakura-pink',
            'css': 'sakura-pink', 'html': 'sakura-pink',
            'java': 'dark-purple', 'c++': 'tech-grid', 'c': 'matte-metal',
            'ruby': 'warm-orange', 'swift': 'neon-blue', 'kotlin': 'dark-purple',
        }
        style_id = lang_map.get(language, 'dark-purple')

    # Build scene configs
    title = info.get('title', repo_url.rstrip('/').split('/')[-1])
    tagline = info.get('tagline', '')
    points = info.get('points', [])
    url = info.get('url', repo_url)
    stats = info.get('stats', '')
    summary = info.get('summary', '')

    # Structure selection
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

    # ── Add sensible transition defaults ──
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


# ── Time allocation ─────────────────────────────────────────

def allocate(manifest_path, total_time, output_dir, content_dir=None, repo_url=None, bg_type='starfield', strict=False, style=None, structure=None, manual_images=None, manual_videos=None, use_llm=False, llm_api_key=None, llm_provider='deepseek'):
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    with open(manifest_path) as f:
        data = json.load(f)

    # ── Schema validation ──
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

    # Detect v2 material_manifest.json format
    if isinstance(data, dict) and data.get('version') == '2' and 'materials' in data:
        manifest = data['materials']
        manifest = [m for m in manifest if m.get('type') in (
            'scroll_video', 'extracted_video', 'image', 'link_video',
            'code_snippet', 'screenshot', 'source_code', 'doc_page',
            'manual_video', 'manual_image',
        )]
        print(f"  (v2 material_manifest.json: {len(manifest)} usable materials)")

    # ── Group by type (priority order) ──
    extracted_videos = [m for m in manifest if m['type'] == 'extracted_video']
    images = [m for m in manifest if m['type'] == 'image']
    scroll_videos = [m for m in manifest if m['type'] == 'scroll_video']
    link_videos = [m for m in manifest if m['type'] == 'link_video']
    # v2 types
    code_snippets = [m for m in manifest if m['type'] == 'code_snippet']
    screenshots = [m for m in manifest if m['type'] == 'screenshot']
    manual_videos = [m for m in manifest if m['type'] == 'manual_video']
    manual_images = [m for m in manifest if m['type'] == 'manual_image']

    # Inject CLI-provided manual materials
    for img_path in (manual_images or []):
        manual_images.append({'type': 'manual_image', 'path': img_path})
    for vid_path in (manual_videos or []):
        manual_videos.append({'type': 'manual_video', 'path': vid_path})

    # Merge manual materials into main type groups
    images.extend(manual_images)
    extracted_videos.extend(manual_videos)

    # Render intro/outro + main content via Remotion VideoComposer
    repo_name = repo_url.rstrip('/').split('/')[-1] if repo_url else 'unknown'
    if content_dir and os.path.isdir(content_dir):
        info = read_content(content_dir, repo_name)
    else:
        info = generate_simple_info(repo_url) if repo_url else {'title': 'Video', 'tagline': '', 'points': [], 'summary': '', 'stats': '', 'url': ''}

    if use_llm:
        import importlib.util as _util, os as _os
        _llm_path = _os.path.abspath(_os.path.join(
            _os.path.dirname(__file__), '..', '..',
            'pipeline-orchestrator', 'llm_matcher.py'))
        _spec = _util.spec_from_file_location("llm_matcher", _llm_path)
        _llm = _util.module_from_spec(_spec)
        _spec.loader.exec_module(_llm)
        config = _llm.build_video_config_with_llm(
            info, repo_url or '', bg_type,
            style_id=style, structure_id=structure,
            api_key=llm_api_key, provider=llm_provider,
        )
    else:
        config = build_video_config(info, repo_url or '', bg_type, style_id=style, structure_id=structure)

    structure_id_used = config['structureId']
    structure_scene_defs = {
        'funnel':           [('hook', 5), ('problem', 6), ('solution', 6), ('showcase', total_time - 36), ('features', 8), ('cta', 6)],
        'timeline':         [('hook', 4), ('origin', 6), ('milestones', 8), ('showcase', total_time - 30), ('today', 6), ('cta', 6)],
        'product-showcase': [('hook', 4), ('problem', 5), ('demo', total_time - 29), ('features', 8), ('proof', 5), ('cta', 6)],
        'performance-launch': [('hook', 4), ('proof-1', 7), ('proof-2', 7), ('showcase', total_time - 36), ('features', 10), ('cta', 6)],
    }
    structure_scenes = structure_scene_defs.get(structure_id_used, structure_scene_defs['funnel'])
    vc_duration = sum(d for _, d in structure_scenes if d > 0)
    vc_frames = int(vc_duration * 30)

    dynamic_scene = 'demo' if structure_id_used == 'product-showcase' else 'showcase'
    if dynamic_scene in config.get('sceneConfigs', {}):
        config['sceneConfigs'][dynamic_scene]['durationSeconds'] = max(0, total_time - sum(d for s, d in structure_scenes if s != dynamic_scene))

    # ── Populate scenes with material media URLs ──
    if isinstance(data, dict) and 'materials' in data:
        materials = data['materials']
        scroll_videos = [m for m in materials if m['type'] == 'scroll_video']
        extracted_videos = [m for m in materials if m['type'] == 'extracted_video']
        images = [m for m in materials if m['type'] == 'image']

        # Showcase scene: use scroll video if available
        if dynamic_scene in config.get('sceneConfigs', {}) and scroll_videos:
            config['sceneConfigs'][dynamic_scene]['content']['visual'] = scroll_videos[0]['path']

        # Assign videos to features/proof scenes for visual variety
        all_videos = extracted_videos[:6]  # use up to 6 videos
        for i, vid in enumerate(all_videos):
            scene_key = f'features' if i < 3 else dynamic_scene
            if scene_key in config.get('sceneConfigs', {}):
                if 'visual' not in config['sceneConfigs'][scene_key].get('content', {}):
                    config['sceneConfigs'][scene_key]['content'] = config['sceneConfigs'][scene_key].get('content', {}) or {}
                    config['sceneConfigs'][scene_key]['content']['visual'] = vid['path']

    print(f"\n  Rendering VideoComposer: {structure_id_used} ({vc_duration}s, {vc_frames}f)")
    vc_success = render.render_video_composer(output_dir, config)

    if vc_success:
        print(f"  ✓ VideoComposer rendered: {os.path.join(output_dir, 'video_composer.mp4')}")
    else:
        print(f"  ✗ VideoComposer failed, falling back to intro/outro")
        generate_intro_outro(output_dir, content_dir, repo_url, bg_type)


# ── CLI ─────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Allocate time and generate intro/outro + concat list (v2: Remotion)')
    parser.add_argument('manifest', help='Path to manifest_full.json')
    parser.add_argument('total_duration', type=float, help='Target total duration in seconds')
    parser.add_argument('--output-dir', default='./output', help='Output directory')
    parser.add_argument('--content-dir', default=None, help='Content directory with repo archive and script')
    parser.add_argument('--repo-url', default=None, help='Repository URL (for fallback intro/outro)')
    parser.add_argument('--bg-type', default='starfield',
                        choices=['starfield', 'bokeh', 'geometric', 'pixel'],
                        help='Background animation type (default: starfield)')
    parser.add_argument('--strict', action='store_true',
                        help='Enable strict manifest schema validation (rejects non-standard manifests)')
    parser.add_argument('--style', default=None,
                        help='Style template ID (e.g. dark-purple, tech-grid). Auto-matched if not specified.')
    parser.add_argument('--structure', default=None,
                        help='Structure template ID (e.g. funnel, timeline, product-showcase). Auto-matched if not specified.')
    parser.add_argument('--srt', default=None,
                        help='Path to SRT subtitle file to burn into final video')
    parser.add_argument('--manual-image', default=None, action='append',
                        help='User-provided image file path (repeatable)')
    parser.add_argument('--manual-video', default=None, action='append',
                        help='User-provided video file path (repeatable)')
    parser.add_argument('--use-llm', action='store_true',
                        help='Use LLM-based template matching (requires --llm-api-key or DEEPSEEK_API_KEY env)')
    parser.add_argument('--llm-api-key', default=None,
                        help='API key for LLM matching (DeepSeek or OpenAI-compatible)')
    parser.add_argument('--llm-provider', default='deepseek', choices=['deepseek', 'openai'],
                        help='LLM provider for matching (default: deepseek)')

    args = parser.parse_args()
    allocate(args.manifest, args.total_duration, args.output_dir, args.content_dir, args.repo_url, args.bg_type,
             strict=args.strict, style=args.style, structure=args.structure,
             manual_images=args.manual_image, manual_videos=args.manual_video,
             use_llm=args.use_llm, llm_api_key=args.llm_api_key, llm_provider=args.llm_provider)

    # Post-prod: subtitle burning
    if args.srt:
        final_mp4 = os.path.join(args.output_dir, 'final.mp4')
        if not os.path.exists(final_mp4):
            print(f"  WARNING: final.mp4 not found at {final_mp4}, skipping subtitle burn")
        else:
            burn_subtitles(final_mp4, args.srt)
