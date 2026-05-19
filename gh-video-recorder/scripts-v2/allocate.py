#!/usr/bin/env python3
"""
allocate.py (v2) — 时间分配 + intro/outro 生成 + concat_list 生成

v2: 使用 Remotion 渲染 intro/outro（替代 v1 的 HTML + Playwright 截图方式）
    支持 4 种动态背景 + Ken Burns 图片素材动效 + manifest schema 验证

Usage:
    python3 allocate.py <manifest_full.json> <total_duration> [--output-dir DIR]
                       [--content-dir DIR] [--bg-type TYPE] [--strict]
"""

import json
import sys
import os
import re
import subprocess
import argparse
import random
import shutil
from typing import List, Optional
from dataclasses import dataclass, field, asdict

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REMOTION_DIR = os.path.join(PROJECT_DIR, "remotion")

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


@dataclass
class ManifestEntry:
    """单个素材条目的数据契约。"""
    type: str          # scroll_video | extracted_video | image | link_video
    path: str          # 相对路径
    duration: float = 0.0
    sourceUrl: str = ""
    label: str = ""
    fileSize: float = 0.0


@dataclass
class Manifest:
    """完整 manifest 的数据契约。"""
    version: str = "1"
    schema_ref: str = "manifest-full-schema.json"
    createdAt: str = ""
    repoUrl: str = ""
    entries: List[ManifestEntry] = field(default_factory=list)


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


# ── Ken Burns motion modes ──────────────────────────────────
KEN_BURNS_MODES = [
    # slow-zoom-in: center→center, 1.0→1.3
    {"panFromX": 0.5, "panFromY": 0.5, "panToX": 0.5, "panToY": 0.5, "zoomFrom": 1.0, "zoomTo": 1.3},
    # pan-left: right→left, 1.2→1.2
    {"panFromX": 0.7, "panFromY": 0.5, "panToX": 0.3, "panToY": 0.5, "zoomFrom": 1.2, "zoomTo": 1.2},
    # pan-right: left→right, 1.15→1.15
    {"panFromX": 0.3, "panFromY": 0.5, "panToX": 0.7, "panToY": 0.5, "zoomFrom": 1.15, "zoomTo": 1.15},
    # diagonal: top-right→bottom-left, 1.0→1.25
    {"panFromX": 0.7, "panFromY": 0.3, "panToX": 0.3, "panToY": 0.7, "zoomFrom": 1.0, "zoomTo": 1.25},
    # slow-zoom-out: center→center, 1.3→1.0
    {"panFromX": 0.5, "panFromY": 0.5, "panToX": 0.5, "panToY": 0.5, "zoomFrom": 1.3, "zoomTo": 1.0},
]

# ── Helper: strip markdown formatting ──────────────────────
def strip_md(text):
    """Remove markdown bold/italic markers from text."""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    return text

# ── Read content ───────────────────────────────────────────

def read_content(content_dir, repo_name):
    """Read repo archive and script from content directory."""
    info = {'title': repo_name, 'tagline': '', 'points': [], 'summary': '', 'outro_extra': '', 'stats': ''}

    # Find repo archive file
    for fname in os.listdir(content_dir):
        if fname.endswith('.md') and repo_name in fname and '口播' not in fname and '封面' not in fname:
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

    # Find script file
    for fname in os.listdir(content_dir):
        if fname.endswith('.md') and repo_name in fname and '口播' in fname:
            fpath = os.path.join(content_dir, fname)
            with open(fpath, 'r') as f:
                content = f.read()
            lines = content.strip().split('\n')
            text_lines = [l.strip() for l in lines if l.strip() and not l.startswith('#')]
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


def remotion_render(composition_id, output_path, props, cwd=None):
    """Render a Remotion composition with given props."""
    props_path = output_path.replace('.mp4', '_props.json')
    with open(props_path, 'w') as f:
        json.dump(props, f, ensure_ascii=False)

    cmd = [
        'npx', 'remotion', 'render', composition_id,
        output_path,
        '--props', props_path,
        '--codec', 'h264',
        '--crf', '18',
    ]
    print(f"  Remotion render: {' '.join(cmd[:4])} ... --props ...")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=180)
    if result.returncode != 0:
        print(f"  WARNING: Remotion render failed: {result.stderr.strip()}")
        return False
    # Clean up props file
    if os.path.exists(props_path):
        os.unlink(props_path)
    return True


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
    if remotion_render('Intro', intro_mp4, intro_props_v0, cwd=REMOTION_DIR):
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
        if remotion_render('Intro', intro_mp4, intro_props_v1, cwd=REMOTION_DIR):
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
    if remotion_render('Outro', outro_mp4, outro_props_v0, cwd=REMOTION_DIR):
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
        if remotion_render('Outro', outro_mp4, outro_props_v1, cwd=REMOTION_DIR):
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
    return intro_result, outro_result


def image_to_video_clip(image_path, mp4_path, duration):
    """Convert a single image to a video clip with Ken Burns effect via Remotion."""
    orig_path = image_path

    # Handle SVG conversion
    if image_path.lower().endswith('.svg'):
        png_path = mp4_path.replace('.mp4', '.png')
        try:
            if shutil.which('rsvg-convert'):
                subprocess.run(['rsvg-convert', '-w', '1920', '-h', '1080',
                                image_path, '-o', png_path], check=True, capture_output=True, timeout=30)
                image_path = png_path
            elif shutil.which('convert'):
                subprocess.run(['convert', '-background', 'none',
                                image_path, '-resize', '1920x1080', png_path],
                               check=True, capture_output=True, timeout=30)
                image_path = png_path
            else:
                print(f"    WARNING: cannot convert SVG (install librsvg or ImageMagick): {image_path}")
                return
        except subprocess.CalledProcessError:
            print(f"    WARNING: SVG conversion failed: {image_path}")
            return

    # ── Try Remotion KenBurnsClip first ──
    public_dir = os.path.join(REMOTION_DIR, 'public')
    os.makedirs(public_dir, exist_ok=True)

    ext = os.path.splitext(image_path)[1]
    safe_name = os.path.basename(mp4_path).replace('.mp4', '').replace(' ', '_')
    temp_name = f'kb_{safe_name}{ext}'
    public_path = os.path.join(public_dir, temp_name)

    try:
        shutil.copy2(image_path, public_path)

        mode = random.choice(KEN_BURNS_MODES)
        props = {
            "imageUrl": temp_name,
            "durationInFrames": int(duration * 30),
            **mode,
        }

        if remotion_render('KenBurnsClip', mp4_path, props, cwd=REMOTION_DIR):
            os.unlink(public_path)
            if image_path != orig_path and os.path.exists(image_path):
                os.unlink(image_path)
            return
        else:
            os.unlink(public_path)
    except Exception as e:
        print(f"    WARNING: KenBurnsClip failed ({e}), falling back to ffmpeg")
        if os.path.exists(public_path):
            os.unlink(public_path)

    # ── Fallback: ffmpeg static image ──
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', image_path,
        '-t', str(duration),
        '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
        mp4_path
    ], check=True, capture_output=True)
    if image_path != orig_path and os.path.exists(image_path):
        os.unlink(image_path)


def get_video_duration(mp4_path):
    """Get video duration in seconds using ffprobe."""
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', mp4_path
        ], capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return float(data['format']['duration'])
    except Exception:
        pass
    return 0


def trim_video(src_path, dst_path, target_duration):
    """Trim a video to target duration using ffmpeg (fast seek)."""
    src = os.path.abspath(src_path)
    dst = os.path.abspath(dst_path)
    subprocess.run([
        'ffmpeg', '-y', '-ss', '0', '-i', src,
        '-t', str(target_duration),
        '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
        dst
    ], check=True, capture_output=True, timeout=300)
    return dst_path


# ── Time allocation ─────────────────────────────────────────

def allocate(manifest_path, total_time, output_dir, content_dir=None, repo_url=None, bg_type='starfield', strict=False):
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

    # ── Group by type (priority order) ──
    extracted_videos = [m for m in manifest if m['type'] == 'extracted_video']
    images = [m for m in manifest if m['type'] == 'image']
    scroll_videos = [m for m in manifest if m['type'] == 'scroll_video']
    link_videos = [m for m in manifest if m['type'] == 'link_video']

    intro_duration = 10
    outro_duration = 10
    reserved = intro_duration + outro_duration
    available = total_time - reserved

    if available <= 0:
        print(f"WARNING: Total time {total_time}s too short for intro/outro, using {total_time}s directly")
        available = max(total_time - 2, 0)
        intro_duration = 1
        outro_duration = 1

    # Generate intro/outro videos via Remotion
    generate_intro_outro(output_dir, content_dir, repo_url, bg_type)

    extracted_count = len(extracted_videos)
    image_count = len(images)
    scroll_count = len(scroll_videos)
    link_count = len(link_videos)

    # ── 1. Extracted videos: keep original duration, trim proportionally if over budget ──
    extracted_durations = []
    for v in extracted_videos:
        vpath = os.path.join(output_dir, v['path']) if not os.path.isabs(v['path']) else v['path']
        if not os.path.exists(vpath):
            vpath = os.path.join(os.path.dirname(manifest_path), v['path'])
        d = get_video_duration(vpath) or v.get('duration', 0)
        extracted_durations.append(d)

    extracted_total_raw = sum(extracted_durations)
    print(f"\n  Extracted videos: {extracted_count} files, total {extracted_total_raw:.1f}s (raw)")

    # Extracted videos get up to 40% of available budget
    extracted_budget = available * 0.40
    if extracted_total_raw > extracted_budget and extracted_count > 0:
        ratio = extracted_budget / extracted_total_raw
        for i, item in enumerate(extracted_videos):
            src = os.path.join(output_dir, item['path']) if not os.path.isabs(item['path']) else item['path']
            if not os.path.exists(src):
                src = os.path.join(os.path.dirname(manifest_path), item['path'])
            new_dur = round(extracted_durations[i] * ratio, 1)
            if new_dur < 3: new_dur = 3  # minimum 3s
            trimmed_name = item['path'].rsplit('.', 1)[0] + '_trimmed.mp4'
            trimmed_path = os.path.join(output_dir, trimmed_name)
            print(f"    Trimming {item['path']}: {extracted_durations[i]:.1f}s → {new_dur}s")
            trim_video(src, trimmed_path, new_dur)
            item['_trimmed'] = trimmed_name
            item['_duration'] = new_dur
    else:
        for item in extracted_videos:
            item['_trimmed'] = item['path']
            item['_duration'] = max(3, extracted_durations[extracted_videos.index(item)])

    extracted_total = sum(item.get('_duration', 0) for item in extracted_videos)

    # ── 2. Images: target 25% of total, clamped 10-50% ──
    if image_count > 0:
        image_time_per = max(4, min(10, total_time * 0.25 / image_count))
        image_total = image_time_per * image_count
        if image_total > total_time * 0.50:
            image_time_per = max(4, (total_time * 0.50) / image_count)
            image_total = image_time_per * image_count
        elif image_total < total_time * 0.10:
            image_time_per = max(4, (total_time * 0.10) / image_count)
            image_total = image_time_per * image_count
    else:
        image_time_per = 0
        image_total = 0

    # ── 3. Scroll videos: fill remaining budget ──
    scroll_budget = available - extracted_total - image_total

    scroll_durations = []
    for v in scroll_videos:
        vpath = os.path.join(output_dir, v['path']) if not os.path.isabs(v['path']) else v['path']
        if not os.path.exists(vpath):
            vpath = os.path.join(os.path.dirname(manifest_path), v['path'])
        d = get_video_duration(vpath) or v.get('duration', 0)
        scroll_durations.append(d)

    scroll_total_raw = sum(scroll_durations)
    print(f"\n  Scroll videos: {scroll_count} files, total {scroll_total_raw:.1f}s (raw, budget: {scroll_budget:.1f}s)")

    if scroll_total_raw > scroll_budget and scroll_count > 0:
        ratio = scroll_budget / scroll_total_raw
        for i, item in enumerate(scroll_videos):
            src = os.path.join(output_dir, item['path']) if not os.path.isabs(item['path']) else item['path']
            if not os.path.exists(src):
                src = os.path.join(os.path.dirname(manifest_path), item['path'])
            new_dur = round(scroll_durations[i] * ratio, 1)
            if new_dur < 5: new_dur = 5
            trimmed_name = item['path'].rsplit('.', 1)[0] + '_trimmed.mp4'
            trimmed_path = os.path.join(output_dir, trimmed_name)
            print(f"    Trimming {item['path']}: {scroll_durations[i]:.1f}s → {new_dur}s")
            trim_video(src, trimmed_path, new_dur)
            item['_trimmed'] = trimmed_name
            item['_duration'] = new_dur
    else:
        for item in scroll_videos:
            item['_trimmed'] = item['path']
            item['_duration'] = max(5, scroll_durations[scroll_videos.index(item)] if scroll_count > 0 else 0)

    # ── 4. Link videos: minimal allocation ──
    link_budget = max(0, available - extracted_total - image_total - sum(item.get('_duration', 0) for item in scroll_videos))
    link_durations = []
    for v in link_videos:
        vpath = os.path.join(output_dir, v['path']) if not os.path.isabs(v['path']) else v['path']
        if not os.path.exists(vpath):
            vpath = os.path.join(os.path.dirname(manifest_path), v['path'])
        d = get_video_duration(vpath) or v.get('duration', 0)
        link_durations.append(d)

    link_total_raw = sum(link_durations)
    if link_total_raw > link_budget and link_count > 0:
        ratio = link_budget / link_total_raw
        for i, item in enumerate(link_videos):
            src = os.path.join(output_dir, item['path']) if not os.path.isabs(item['path']) else item['path']
            if not os.path.exists(src):
                src = os.path.join(os.path.dirname(manifest_path), item['path'])
            new_dur = round(link_durations[i] * ratio, 1)
            if new_dur < 5: new_dur = 5
            trimmed_name = item['path'].rsplit('.', 1)[0] + '_trimmed.mp4'
            trimmed_path = os.path.join(output_dir, trimmed_name)
            print(f"    Trimming {item['path']}: {link_durations[i]:.1f}s → {new_dur}s")
            trim_video(src, trimmed_path, new_dur)
            item['_trimmed'] = trimmed_name
            item['_duration'] = new_dur
    else:
        for item in link_videos:
            item['_trimmed'] = item['path']
            item['_duration'] = max(5, link_durations[link_videos.index(item)] if link_count > 0 else 0)

    # ── Convert images to video clips with Ken Burns ──
    image_clips = {}
    if image_count > 0 and image_time_per > 0:
        print("\n  Converting images to video clips (Ken Burns)...")
        for item in images:
            img_path = item['path']
            if '/' in img_path:
                rel_path = img_path
            else:
                rel_path = f'materials/{img_path}'
            abs_img = os.path.join(output_dir, rel_path)
            if not os.path.exists(abs_img):
                abs_img = os.path.join(output_dir, img_path)
            if os.path.exists(abs_img):
                clip_name = img_path.replace('/', '_').rsplit('.', 1)[0] + '.mp4'
                clip_path = os.path.join(output_dir, clip_name)
                image_to_video_clip(abs_img, clip_path, image_time_per)
                image_clips[img_path] = clip_name
                print(f"    {clip_name}")
            else:
                print(f"    WARNING: image not found: {abs_img}")

    # ── Build timeline by priority: intro → extracted_videos → images → scroll_videos → link_videos → outro ──
    timeline = []
    timeline.append({"file": "intro.mp4", "duration": intro_duration, "type": "intro"})

    for item in extracted_videos:
        trimmed = item.get('_trimmed', item['path'])
        dur = item.get('_duration', 0)
        timeline.append({"file": trimmed, "duration": round(dur, 1), "type": "extracted_video"})

    for item in images:
        clip_name = image_clips.get(item['path'])
        if clip_name:
            timeline.append({"file": clip_name, "duration": round(image_time_per, 1), "type": "image"})

    for item in scroll_videos:
        trimmed = item.get('_trimmed', item['path'])
        dur = item.get('_duration', 0)
        timeline.append({"file": trimmed, "duration": round(dur, 1), "type": "scroll_video"})

    for item in link_videos:
        trimmed = item.get('_trimmed', item['path'])
        dur = item.get('_duration', 0)
        timeline.append({"file": trimmed, "duration": round(dur, 1), "type": "link_video"})

    timeline.append({"file": "outro.mp4", "duration": outro_duration, "type": "outro"})

    # Write timeline.json
    timeline_path = os.path.join(output_dir, 'timeline.json')
    with open(timeline_path, 'w') as f:
        json.dump(timeline, f, indent=2)

    # Normalize all video files to consistent params before concat
    # (yuv420p + 30fps) to avoid ffmpeg concat demuxer issues
    for entry in timeline:
        src = os.path.join(output_dir, entry['file'])
        if not os.path.exists(src) or not entry['file'].endswith('.mp4'):
            continue
        probe = subprocess.run([
            'ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=pix_fmt,r_frame_rate',
            '-of', 'json', src
        ], capture_output=True, text=True, timeout=15)
        needs_normalize = False
        try:
            info = json.loads(probe.stdout)['streams'][0]
            if info.get('pix_fmt') != 'yuv420p':
                needs_normalize = True
            if info.get('r_frame_rate', '30/1') != '30/1':
                needs_normalize = True
        except (IndexError, KeyError, json.JSONDecodeError):
            needs_normalize = True

        if needs_normalize:
            tmp = src + '.norm.mp4'
            print(f"  Normalizing {entry['file']} → yuv420p/30fps")
            subprocess.run([
                'ffmpeg', '-y', '-i', src,
                '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-r', '30',
                tmp
            ], check=True, capture_output=True, timeout=120)
            os.replace(tmp, src)

    # Generate concat_list.txt
    concat_path = os.path.join(output_dir, 'concat_list.txt')
    with open(concat_path, 'w') as f:
        for entry in timeline:
            f.write(f"file '{entry['file']}'\n")

    total_allocated = sum(e['duration'] for e in timeline)
    actual_image_ratio = image_total / total_time if total_time > 0 else 0
    print(f"\nTimeline: {len(timeline)} clips, total {total_allocated:.1f}s (target: {total_time}s)")
    print(f"  Intro: {intro_duration}s | Outro: {outro_duration}s")
    print(f"  Background: {bg_type}")
    print(f"  Extracted videos: {extracted_count} files → {extracted_total:.1f}s")
    if extracted_count > 0:
        for i, v in enumerate(extracted_videos):
            print(f"    {v['path']}: {extracted_durations[i]:.1f}s → {v.get('_duration', 0):.1f}s")
    if scroll_count > 0:
        print(f"  Scroll videos: {scroll_count} files")
        for i, v in enumerate(scroll_videos):
            print(f"    {v['path']}: {scroll_durations[i]:.1f}s → {v.get('_duration', 0):.1f}s")
    if link_count > 0:
        print(f"  Link videos: {link_count} files")
    if image_count > 0:
        print(f"  Images: {image_count} × {image_time_per:.1f}s = {image_count * image_time_per:.1f}s ({actual_image_ratio*100:.0f}%)")
    else:
        print(f"  Images: none")
    print(f"Timeline: {timeline_path}")
    print(f"Concat:   {concat_path}")


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

    args = parser.parse_args()
    allocate(args.manifest, args.total_duration, args.output_dir, args.content_dir, args.repo_url, args.bg_type, strict=args.strict)
