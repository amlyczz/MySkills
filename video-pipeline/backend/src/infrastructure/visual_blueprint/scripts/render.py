#!/usr/bin/env python3
"""
render.py — Remotion 渲染封装。

提供 pipeline-orchestrator 和 allocate.py 调用的渲染函数：
  - remotion_render(): 渲染单个 Composition
  - render_video_composer(): 渲染 VideoComposer（含 sceneConfig 注入）
  - image_to_video_clip(): 图片 → 视频（Ken Burns / ffmpeg 降级）
  - speed_remap(): 视频变速
  - trim_video(): 视频裁剪
  - get_video_duration(): ffprobe 获取时长
"""

import json
import os
import random
import shutil
import subprocess
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))
REMOTION_DIR = os.path.join(REPO_ROOT, "frontend", "remotion")

# ── Ken Burns 动效模式 ─────────────────────────────
KEN_BURNS_MODES = [
    {"panFromX": 0.5, "panFromY": 0.5, "panToX": 0.5, "panToY": 0.5, "zoomFrom": 1.0, "zoomTo": 1.3},
    {"panFromX": 0.7, "panFromY": 0.5, "panToX": 0.3, "panToY": 0.5, "zoomFrom": 1.2, "zoomTo": 1.2},
    {"panFromX": 0.3, "panFromY": 0.5, "panToX": 0.7, "panToY": 0.5, "zoomFrom": 1.15, "zoomTo": 1.15},
    {"panFromX": 0.7, "panFromY": 0.3, "panToX": 0.3, "panToY": 0.7, "zoomFrom": 1.0, "zoomTo": 1.25},
    {"panFromX": 0.5, "panFromY": 0.5, "panToX": 0.5, "panToY": 0.5, "zoomFrom": 1.3, "zoomTo": 1.0},
]


def remotion_render(composition_id: str, output_path: str, props: dict,
                    cwd: str | None = None) -> bool:
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
    result = subprocess.run(cmd, cwd=cwd or REMOTION_DIR, capture_output=True,
                            text=True, timeout=300)
    if result.returncode != 0:
        print(f"  WARNING: Remotion render failed: {result.stderr.strip()}")
        if os.path.exists(props_path):
            os.unlink(props_path)
        return False
    if os.path.exists(props_path):
        os.unlink(props_path)
    return True


def render_video_composer(output_dir: str, config: dict) -> bool:
    """Render VideoComposer with given config into output_dir/video_composer.mp4."""
    config_path = os.path.join(output_dir, 'video_config.json')
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    props = {"config": config}
    output_path = os.path.join(output_dir, 'video_composer.mp4')

    style_id = config.get('styleId', 'dark-purple')
    bg_type = config.get('bgType', 'starfield')
    print(f"\n  [VC] Rendering VideoComposer (style: {style_id}, bg: {bg_type})...")
    return remotion_render('VideoComposer', output_path, props)


def image_to_video_clip(image_path: str, mp4_path: str, duration: float) -> None:
    """Convert image to video clip with Ken Burns effect (Remotion → ffmpeg fallback)."""
    orig_path = image_path

    # SVG → PNG conversion
    if image_path.lower().endswith('.svg'):
        png_path = mp4_path.replace('.mp4', '.png')
        try:
            if shutil.which('rsvg-convert'):
                subprocess.run(['rsvg-convert', '-w', '1920', '-h', '1080',
                                image_path, '-o', png_path], check=True,
                               capture_output=True, timeout=30)
                image_path = png_path
            elif shutil.which('convert'):
                subprocess.run(['convert', '-background', 'none',
                                image_path, '-resize', '1920x1080', png_path],
                               check=True, capture_output=True, timeout=30)
                image_path = png_path
            else:
                print(f"    WARNING: cannot convert SVG (install librsvg or "
                      f"ImageMagick): {image_path}")
                return
        except subprocess.CalledProcessError:
            print(f"    WARNING: SVG conversion failed: {image_path}")
            return

    # Try Remotion KenBurnsClip
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
        if remotion_render('KenBurnsClip', mp4_path, props):
            os.unlink(public_path)
            if image_path != orig_path and os.path.exists(image_path):
                os.unlink(image_path)
            return
        os.unlink(public_path)
    except Exception as e:
        print(f"    WARNING: KenBurnsClip failed ({e}), falling back to ffmpeg")
        if os.path.exists(public_path):
            os.unlink(public_path)

    # ffmpeg fallback
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', image_path,
        '-t', str(duration),
        '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,'
               'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
        mp4_path
    ], check=True, capture_output=True)
    if image_path != orig_path and os.path.exists(image_path):
        os.unlink(image_path)


def speed_remap(src_path: str, dst_path: str, speed: float) -> str:
    """Speed up (>1.0) or slow down (<1.0) a video via ffmpeg setpts."""
    pts = 1.0 / speed
    subprocess.run([
        'ffmpeg', '-y', '-i', src_path,
        '-filter_complex',
        f'[0:v]setpts={pts}*PTS[v];[0:a]atempo={speed}[a]',
        '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
        dst_path
    ], check=True, capture_output=True, timeout=300)
    return dst_path


def trim_video(src_path: str, dst_path: str, target_duration: float) -> str:
    """Trim a video to target duration using ffmpeg (fast seek)."""
    subprocess.run([
        'ffmpeg', '-y', '-ss', '0', '-i', src_path,
        '-t', str(target_duration),
        '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
        dst_path
    ], check=True, capture_output=True, timeout=300)
    return dst_path


def get_video_duration(mp4_path: str) -> float:
    """Get video duration in seconds using ffprobe."""
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_format', mp4_path
        ], capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return float(data['format']['duration'])
    except Exception:
        pass
    return 0.0


if __name__ == '__main__':
    print(f"render.py — Remotion 渲染工具")
    print(f"  REPO_ROOT:    {REPO_ROOT}")
    print(f"  REMOTION_DIR: {REMOTION_DIR}")
    print(f"  REMOTION_DIR exists: {os.path.isdir(REMOTION_DIR)}")
