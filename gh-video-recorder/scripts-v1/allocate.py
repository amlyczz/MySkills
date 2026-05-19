#!/usr/bin/env python3
"""
allocate.py — 时间分配 + intro/outro 生成 + concat_list 生成

Usage:
    python3 allocate.py <manifest_full.json> <total_duration> [--output-dir DIR] [--content-dir DIR]

如果提供 --content-dir，会读取其中的仓库档案和口播脚本生成有内容的 intro/outro。
否则生成纯色背景 + 项目名的 intro/outro。
"""

import json
import sys
import os
import re
import subprocess
import argparse
import html as html_module
import random

# ── Read proxy config ──────────────────────────────────────────────
def read_proxy_config():
    """Read proxy.json from project root, return (server_url, None) or (None, None)."""
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    proxy_path = os.path.join(project_dir, 'proxy.json')
    try:
        if os.path.exists(proxy_path):
            cfg = json.load(open(proxy_path))
            if cfg.get('enabled'):
                host = cfg.get('host', cfg.get('platform') == 'wsl' and 'host.docker.internal' or '127.0.0.1')
                port = cfg.get('port', 7890)
                return f'http://{host}:{port}'
    except Exception:
        pass
    return None

PROXY_SERVER = read_proxy_config()

# Ensure we can import from the templates package (one level up)
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

from templates import TEMPLATES

random.seed()

# ── Helper: strip markdown formatting ──────────────────────────────
def strip_md(text):
    """Remove markdown bold/italic markers from text."""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    return text

# ── Read content ───────────────────────────────────────────────────

def read_content(content_dir, repo_name):
    """Read repo archive and script from content directory."""
    info = {'title': repo_name, 'tagline': '', 'points': [], 'summary': '', 'outro_extra': '', 'stats': ''}

    # Find repo archive file
    for fname in os.listdir(content_dir):
        if fname.endswith('.md') and repo_name in fname and '口播' not in fname and '封面' not in fname:
            fpath = os.path.join(content_dir, fname)
            with open(fpath, 'r') as f:
                content = f.read()
            # Extract fields (strip markdown ** markers)
            m = re.search(r'\*\*一句话定位\*\*：(.+)', content)
            if m:
                info['tagline'] = strip_md(m.group(1).strip())
            m = re.search(r'\*\*GitHub 地址\*\*：(.+)', content)
            if m:
                info['url'] = m.group(1).strip()
            m = re.search(r'\*\*Star 总数\*\*：(.+)', content)
            if m:
                info['stats'] = strip_md(m.group(1).strip())
            # Extract core features (strip markdown)
            points = re.findall(r'^\s*\d+\.\s+(.+)', content, re.MULTILINE)
            if points:
                info['points'] = [strip_md(p) for p in points[:5]]
            # Extract more fields for richer outro
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
                # Take last 2-3 sentences as richer summary
                full_text = '。'.join(l.rstrip('。') for l in text_lines)
                sentences = re.split(r'[。！？]', full_text)
                sentences = [s.strip() for s in sentences if s.strip()]
                # Take last 2 sentences for outro
                last_two = sentences[-2:] if len(sentences) >= 2 else sentences[-1:]
                info['summary'] = ('。'.join(last_two) + '。')[:300]
                # Take a key mid-section sentence for extra detail
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


ANIMATION_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');
body, .card, .container { font-family: 'Inter', 'Noto Sans SC', -apple-system, 'Segoe UI', Roboto, sans-serif !important; }
.title, .card .title, h1, h2, h3 { font-family: 'Inter', 'Noto Sans SC', sans-serif !important; font-weight: 700 !important; }
.tagline, .card .tagline, .points li, .points, p, span, div { font-family: 'Inter', 'Noto Sans SC', sans-serif !important; }
.url, .card .url, .stats, .card .stats, .summary, .card .summary { font-family: 'Inter', 'Noto Sans SC', sans-serif !important; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.title, .card .title { animation: fadeInUp 0.8s ease-out both; }
.tagline, .card .tagline { animation: fadeInUp 0.8s ease-out 0.3s both; }
.divider, .card .divider { animation: fadeInUp 0.6s ease-out 0.6s both; }
.points li { animation: fadeInUp 0.5s ease-out both; }
.points li:nth-child(1) { animation-delay: 0.8s; }
.points li:nth-child(2) { animation-delay: 1.0s; }
.points li:nth-child(3) { animation-delay: 1.2s; }
.points li:nth-child(4) { animation-delay: 1.4s; }
.points li:nth-child(5) { animation-delay: 1.6s; }
.url, .card .url { animation: fadeInUp 0.8s ease-out both; }
.stats, .card .stats { animation: fadeInUp 0.8s ease-out 0.3s both; }
.summary, .card .summary { animation: fadeIn 1s ease-out 0.8s both; }
body { background-size: 200% 200%; animation: gradientShift 6s ease infinite; }
body .card, body.card { background-size: 200% 200%; }
</style>
</head>"""


def html_to_video(html_content, mp4_path, duration=5):
    """Render animated HTML to video via screenshot sequence (avoids blank frames from recordVideo)."""
    mp4_path = os.path.abspath(mp4_path)
    work_dir = mp4_path.replace('.mp4', '_frames')
    os.makedirs(work_dir, exist_ok=True)
    tmp_html = os.path.join(work_dir, 'page.html')

    # Inject animation CSS into HTML
    animated_html = html_content.replace('</head>', ANIMATION_CSS)
    if 'background-size' not in animated_html:
        animated_html = animated_html.replace('<body>', '<body style="background-size:200% 200%">')
    with open(tmp_html, 'w') as f:
        f.write(animated_html)

    fps = 15
    total_frames = duration * fps

    script = '''
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  try {
    const htmlPath = process.argv[2];       // path to HTML file
    const outDir = process.argv[3];          // frames output dir
    const totalFrames = parseInt(process.argv[4], 10);
    const fps = parseInt(process.argv[5], 10);
    const proxyServer = process.argv[6] || '';  // proxy URL
    const intervalMs = Math.floor(1000 / fps);

    const launchOpts = { headless: true };
    if (proxyServer) launchOpts.proxy = { server: proxyServer };
    const browser = await chromium.launch(launchOpts);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // Load HTML and wait for it to fully render
    await page.goto('file://' + htmlPath, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Wait for CSS animations and fonts to load
    await page.waitForTimeout(2000);
    await page.waitForTimeout(500);

    // Take screenshots at regular intervals
    for (let i = 0; i < totalFrames; i++) {
      const filename = String(i).padStart(5, '0') + '.png';
      await page.screenshot({ path: path.join(outDir, filename), type: 'png' });
      await page.waitForTimeout(intervalMs);
    }

    await browser.close();
    console.log('OK:' + totalFrames);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
'''
    script_path = os.path.join(work_dir, 'record.cjs')
    with open(script_path, 'w') as f:
        f.write(script)

    try:
        env = os.environ.copy()
        this_dir = os.path.dirname(os.path.abspath(__file__))
        node_modules = os.path.join(os.path.dirname(this_dir), 'node_modules')
        env['NODE_PATH'] = node_modules

        result = subprocess.run(
            ['node', script_path, tmp_html, work_dir, str(total_frames), str(fps), PROXY_SERVER or ''],
            capture_output=True, text=True, timeout=120, env=env
        )
        if result.returncode != 0:
            print(f"WARNING: screenshot recording failed: {result.stderr.strip()}")
            return False

        # Stitch screenshots into video with ffmpeg (fade in at start, fade out at end)
        fade_frames = fps  # 1s fade
        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-framerate', str(fps),
            '-i', os.path.join(work_dir, '%05d.png'),
            '-vf', (
                f'fade=t=in:s=0:n={fade_frames},'
                f'fade=t=out:s={total_frames - fade_frames}:n={fade_frames}'
            ),
            '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
            mp4_path
        ]
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True, timeout=60)

        if not os.path.exists(mp4_path) or os.path.getsize(mp4_path) == 0:
            return False
        return True
    except Exception as e:
        print(f"WARNING: video generation failed: {e}")
        return False
    finally:
        # Cleanup temp files
        import shutil
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir)


def generate_intro_outro(output_dir, content_dir, repo_url):
    """Generate intro.mp4 and outro.mp4 with random template selection and CSS animations."""
    # Determine repo name from URL
    repo_name = repo_url.rstrip('/').split('/')[-1]

    # Gather content
    if content_dir and os.path.isdir(content_dir):
        info = read_content(content_dir, repo_name)
    else:
        info = generate_simple_info(repo_url)

    # Pick a random template pair
    intro_tpl, outro_tpl, _tpl_name = random.choice(TEMPLATES)

    # Generate intro
    points_html = '\n'.join(f'<li>{html_module.escape(p)}</li>' for p in info.get('points', []))
    intro_html = intro_tpl.replace('{title}', html_module.escape(info.get('title', repo_name)))
    intro_html = intro_html.replace('{tagline}', html_module.escape(info.get('tagline', '')))
    intro_html = intro_html.replace('{points}', points_html)

    intro_duration = 10
    intro_mp4 = os.path.join(output_dir, 'intro.mp4')
    if html_to_video(intro_html, intro_mp4, intro_duration):
        print(f"Generated intro.mp4 ({intro_duration}s, animated)")
    else:
        subprocess.run([
            'ffmpeg', '-y', '-f', 'lavfi', '-i', f'color=c=black:s=1920x1080:d={intro_duration}',
            '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
            intro_mp4
        ], check=True, capture_output=True)
        print(f"Generated intro.mp4 ({intro_duration}s, black fallback)")

    # Build enriched outro summary
    outro_parts = []
    if info.get('summary'):
        outro_parts.append(info['summary'])
    if info.get('outro_extra'):
        outro_parts.append(info['outro_extra'])
    if info.get('domains'):
        outro_parts.append(f"适用领域：{info['domains']}")
    if info.get('language'):
        outro_parts.append(f"主要语言：{info['language']}")

    outro_summary = '\n'.join(outro_parts[:3])  # max 3 lines

    # Generate outro
    outro_html = outro_tpl.replace('{url}', html_module.escape(info.get('url', repo_url)))
    outro_html = outro_html.replace('{stats}', html_module.escape(info.get('stats', '')))
    outro_html = outro_html.replace('{summary}', html_module.escape(outro_summary))

    outro_duration = 10
    outro_mp4 = os.path.join(output_dir, 'outro.mp4')
    if html_to_video(outro_html, outro_mp4, outro_duration):
        print(f"Generated outro.mp4 ({outro_duration}s, animated)")
    else:
        subprocess.run([
            'ffmpeg', '-y', '-f', 'lavfi', '-i', f'color=c=black:s=1920x1080:d={outro_duration}',
            '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
            outro_mp4
        ], check=True, capture_output=True)
        print(f"Generated outro.mp4 ({outro_duration}s, black fallback)")


def image_to_video_clip(image_path, mp4_path, duration):
    """Convert a single image to a video clip with given duration."""
    import shutil
    orig_path = image_path
    # Handle SVG: convert to PNG first (ffmpeg can't handle SVGs)
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
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', image_path,
        '-t', str(duration),
        '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
        mp4_path
    ], check=True, capture_output=True)
    # Cleanup temp PNG
    if image_path != orig_path and os.path.exists(image_path):
        os.unlink(image_path)


# ── Helper: get video duration via ffprobe ──────────────────────────

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


# ── Time allocation ─────────────────────────────────────────────────
# All content types (recording, video materials, images) share time equally.
# Images: target 25% of total, clamped to 10-50%.
# Videos: remaining time, trimmed if too long.

def allocate(manifest_path, total_time, output_dir, content_dir=None, repo_url=None):
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    with open(manifest_path) as f:
        manifest = json.load(f)

    videos = [m for m in manifest if m['type'] == 'video']
    images = [m for m in manifest if m['type'] == 'image']

    intro_duration = 10
    outro_duration = 10
    reserved = intro_duration + outro_duration
    available = total_time - reserved

    if available <= 0:
        print(f"WARNING: Total time {total_time}s too short for intro/outro, using {total_time}s directly")
        available = max(total_time - 2, 0)
        intro_duration = 1
        outro_duration = 1

    # Generate intro/outro videos
    generate_intro_outro(output_dir, content_dir, repo_url)

    image_count = len(images)
    video_count = len(videos)

    # Images: target 25% of total, clamped 10-50%
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

    video_budget = available - image_total
    actual_image_ratio = image_total / total_time if total_time > 0 else 0

    # Get actual video durations for trimming
    video_durations = []
    for v in videos:
        vpath = os.path.join(output_dir, v['path']) if not os.path.isabs(v['path']) else v['path']
        if not os.path.exists(vpath):
            vpath = os.path.join(os.path.dirname(manifest_path), v['path'])
        d = get_video_duration(vpath) or v.get('duration', 0)
        video_durations.append(d)

    video_total_raw = sum(video_durations)
    print(f"\n  Videos: {video_count} files, total {video_total_raw:.1f}s (raw)")

    # Trim videos proportionally if they exceed budget
    if video_total_raw > video_budget and video_count > 0:
        ratio = video_budget / video_total_raw
        for i, item in enumerate(videos):
            src = os.path.join(output_dir, item['path']) if not os.path.isabs(item['path']) else item['path']
            if not os.path.exists(src):
                src = os.path.join(os.path.dirname(manifest_path), item['path'])
            new_dur = round(video_durations[i] * ratio, 1)
            trimmed_name = item['path'].rsplit('.', 1)[0] + '_trimmed.mp4'
            trimmed_path = os.path.join(output_dir, trimmed_name)
            print(f"    Trimming {item['path']}: {video_durations[i]:.1f}s → {new_dur}s")
            trim_video(src, trimmed_path, new_dur)
            item['_trimmed'] = trimmed_name
            item['_duration'] = new_dur
    else:
        for item in videos:
            item['_trimmed'] = item['path']
            item['_duration'] = video_durations[videos.index(item)]

    # Convert images to video clips
    image_clips = {}
    if image_count > 0 and image_time_per > 0:
        print("\n  Converting images to video clips...")
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

    # Build timeline: intro → manifest order → outro
    timeline = []
    timeline.append({"file": "intro.mp4", "duration": intro_duration, "type": "intro"})

    for item in manifest:
        if item['type'] == 'video':
            trimmed = item.get('_trimmed', item['path'])
            dur = item.get('_duration', 0)
            timeline.append({"file": trimmed, "duration": round(dur, 1), "type": "video"})
        elif item['type'] == 'image':
            clip_name = image_clips.get(item['path'])
            if clip_name:
                timeline.append({"file": clip_name, "duration": round(image_time_per, 1), "type": "image"})

    timeline.append({"file": "outro.mp4", "duration": outro_duration, "type": "outro"})

    # Write timeline.json
    timeline_path = os.path.join(output_dir, 'timeline.json')
    with open(timeline_path, 'w') as f:
        json.dump(timeline, f, indent=2)

    # Generate concat_list.txt (files already trimmed to exact duration, no duration directives needed)
    concat_path = os.path.join(output_dir, 'concat_list.txt')
    with open(concat_path, 'w') as f:
        for entry in timeline:
            f.write(f"file '{entry['file']}'\n")

    total_allocated = sum(e['duration'] for e in timeline)
    print(f"\nTimeline: {len(timeline)} clips, total {total_allocated:.1f}s (target: {total_time}s)")
    print(f"  Intro: {intro_duration}s | Outro: {outro_duration}s")
    print(f"  Videos: {video_count} files")
    for i, v in enumerate(videos):
        print(f"    {v['path']}: {video_durations[i]:.1f}s → {v.get('_duration', 0):.1f}s")
    if image_count > 0:
        print(f"  Images: {image_count} × {image_time_per:.1f}s = {image_count * image_time_per:.1f}s ({actual_image_ratio*100:.0f}%)")
    else:
        print(f"  Images: none")
    print(f"Timeline: {timeline_path}")
    print(f"Concat:   {concat_path}")


# ── CLI ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Allocate time and generate intro/outro + concat list')
    parser.add_argument('manifest', help='Path to manifest_full.json')
    parser.add_argument('total_duration', type=float, help='Target total duration in seconds')
    parser.add_argument('--output-dir', default='./output', help='Output directory')
    parser.add_argument('--content-dir', default=None, help='Content directory with repo archive and script')
    parser.add_argument('--repo-url', default=None, help='Repository URL (for fallback intro/outro)')

    args = parser.parse_args()
    allocate(args.manifest, args.total_duration, args.output_dir, args.content_dir, args.repo_url)
