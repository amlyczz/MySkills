#!/usr/bin/env python3
"""
verify_output.py — 素材完整性验证脚本，在 ffmpeg concat 前运行。

验证清单：
  ERROR   1. intro.mp4 存在且可解码
  ERROR   2. outro.mp4 存在且可解码
  ERROR   3. 所有 concat_list.txt 引用文件存在
  WARNING 4. 图片素材可解码
  ERROR   5. 视频素材时长 > 0
  WARNING 6. 素材总时长 >= 目标时长的 50%
  ERROR   7. concat_list.txt 语法正确
  WARNING 8. 素材编码格式一致（均为 h264）

Usage:
    python3 verify_output.py <output_dir> <total_duration> [--manifest MANIFEST]
"""

import json
import os
import sys
import subprocess
import argparse


def check_file_exists(filepath):
    """Check if file exists on disk."""
    return os.path.isfile(filepath)


def check_file_decodable(filepath):
    """Use ffprobe to verify a media file is decodable."""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', filepath],
            capture_output=True, text=True, timeout=30
        )
        return result.returncode == 0 and result.stderr.strip() == ''
    except Exception:
        return False


def get_video_duration(filepath):
    """Get video duration in seconds using ffprobe."""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', filepath],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return float(data['format']['duration'])
    except Exception:
        pass
    return 0


def get_video_codec(filepath):
    """Get video codec name using ffprobe."""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json',
             '-show_streams', filepath],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            for stream in data.get('streams', []):
                if stream.get('codec_type') == 'video':
                    return stream.get('codec_name', 'unknown')
    except Exception:
        pass
    return 'unknown'


def check_concat_syntax(concat_path):
    """Validate concat_list.txt syntax by trying to parse it with ffmpeg."""
    try:
        result = subprocess.run(
            ['ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_path,
             '-t', '0.1', '-f', 'null', '-'],
            capture_output=True, text=True, timeout=30
        )
        return result.returncode == 0
    except Exception:
        return False


def verify(output_dir, total_duration, manifest_path=None):
    """Run all verification checks and return results."""
    output_dir = os.path.abspath(output_dir)
    checks = {}
    warnings = []
    errors = []
    skipped = []

    # ── Locate key files ──
    concat_path = os.path.join(output_dir, 'concat_list.txt')
    intro_path = os.path.join(output_dir, 'intro.mp4')
    outro_path = os.path.join(output_dir, 'outro.mp4')
    timeline_path = os.path.join(output_dir, 'timeline.json')

    # If no manifest specified, derive from output_dir
    if manifest_path is None:
        # Search for manifest_full.json in the output dir
        candidates = [f for f in os.listdir(output_dir) if f.endswith('manifest_full.json')]
        if candidates:
            manifest_path = os.path.join(output_dir, candidates[0])
            print(f"  Auto-detected manifest: {manifest_path}")
        else:
            manifest_path = os.path.join(output_dir, 'manifest_full.json')

    if not os.path.isfile(manifest_path):
        # Try parent dir
        parent = os.path.dirname(output_dir)
        candidates = [f for f in os.listdir(parent) if f.endswith('manifest_full.json')]
        if candidates:
            manifest_path = os.path.join(parent, candidates[0])
            print(f"  Auto-detected manifest (parent): {manifest_path}")

    # ── Read manifest ──
    manifest = []
    if os.path.isfile(manifest_path):
        try:
            with open(manifest_path) as f:
                manifest = json.load(f)
            if isinstance(manifest, list):
                pass  # new format: array of entries
            elif isinstance(manifest, dict) and 'entries' in manifest:
                manifest = manifest['entries']
        except Exception as e:
            errors.append(f"manifest 解析失败: {e}")
    else:
        errors.append(f"manifest 文件不存在: {manifest_path}")

    # ── Collect all referenced files ──
    referenced_files = []

    # From concat_list.txt
    concat_files = []
    if os.path.isfile(concat_path):
        with open(concat_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("file '"):
                    name = line[6:-1]
                    concat_files.append(name)
                    referenced_files.append(os.path.join(output_dir, name))

    # From manifest (check materials referenced there too)
    manifest_files = []
    for entry in manifest if isinstance(manifest, list) else []:
        if isinstance(entry, dict) and 'path' in entry:
            entry_path = entry['path']
            abs_path = os.path.join(output_dir, entry_path)
            if entry_path not in concat_files:
                manifest_files.append(entry_path)
                referenced_files.append(abs_path)

    # ── Checks ──

    # Check 1: intro.mp4
    intro_ok = check_file_exists(intro_path) and check_file_decodable(intro_path)
    checks['intro'] = 'ok' if intro_ok else 'error'
    if not intro_ok:
        errors.append(f"intro.mp4 缺失或不可解码: {intro_path}")

    # Check 2: outro.mp4
    outro_ok = check_file_exists(outro_path) and check_file_decodable(outro_path)
    checks['outro'] = 'ok' if outro_ok else 'error'
    if not outro_ok:
        errors.append(f"outro.mp4 缺失或不可解码: {outro_path}")

    # Check 3: all concat_list.txt files exist
    missing_files = []
    for f in referenced_files:
        if not check_file_exists(f):
            missing_files.append(os.path.basename(f))
    checks['files_exist'] = 'ok' if not missing_files else 'error'
    if missing_files:
        errors.append(f"concat_list.txt 引用的文件缺失: {', '.join(missing_files)}")

    # Check 4: image files decodable
    image_issues = []
    for entry in manifest if isinstance(manifest, list) else []:
        if isinstance(entry, dict) and entry.get('type') == 'image':
            img_path = os.path.join(output_dir, entry['path'])
            if os.path.isfile(img_path):
                # Check if image is readable via ffprobe
                if not check_file_decodable(img_path):
                    image_issues.append(os.path.basename(entry['path']))
    checks['images'] = 'ok' if not image_issues else 'warning'
    if image_issues:
        warnings.append(f"图片素材不可解码: {', '.join(image_issues)}")

    # Check 5: video duration > 0
    zero_duration = []
    for entry in manifest if isinstance(manifest, list) else []:
        if isinstance(entry, dict) and entry.get('type') in ('scroll_video', 'extracted_video', 'link_video'):
            vpath = os.path.join(output_dir, entry['path'])
            if os.path.isfile(vpath):
                d = get_video_duration(vpath)
                if d <= 0:
                    zero_duration.append(os.path.basename(entry['path']))
    checks['duration'] = 'ok' if not zero_duration else 'error'
    if zero_duration:
        errors.append(f"视频素材时长为 0: {', '.join(zero_duration)}")

    # Check 6: total duration >= 50% of target
    total_dur = 0
    for f in referenced_files:
        if os.path.isfile(f):
            ext = os.path.splitext(f)[1].lower()
            if ext in ('.mp4', '.webm', '.mov', '.mkv'):
                total_dur += get_video_duration(f)
    min_required = total_duration * 0.50
    checks['total_duration'] = 'ok' if total_dur >= min_required else 'warning'
    if total_dur < min_required:
        warnings.append(
            f"素材总时长 {total_dur:.1f}s 不足目标时长 {total_duration}s 的 50% ({min_required:.1f}s)"
        )

    # Check 7: concat_list.txt syntax
    if os.path.isfile(concat_path):
        syntax_ok = check_concat_syntax(concat_path)
        checks['concat_syntax'] = 'ok' if syntax_ok else 'error'
        if not syntax_ok:
            errors.append("concat_list.txt 语法有误，ffmpeg 无法解析")
    else:
        checks['concat_syntax'] = 'error'
        errors.append("concat_list.txt 不存在")

    # Check 8: codec consistency (all h264)
    codec_mismatches = []
    for f in referenced_files:
        if os.path.isfile(f):
            ext = os.path.splitext(f)[1].lower()
            if ext in ('.mp4', '.webm', '.mov'):
                codec = get_video_codec(f)
                if codec != 'h264' and codec != 'unknown':
                    codec_mismatches.append(f"{os.path.basename(f)} ({codec})")
    checks['codec'] = 'ok' if not codec_mismatches else 'warning'
    if codec_mismatches:
        warnings.append(f"素材编码非 H264: {', '.join(codec_mismatches)}")

    # ── Result ──
    passed = len(errors) == 0
    result = {
        'passed': passed,
        'checks': checks,
        'warnings': warnings,
        'errors': errors,
        'skipped_materials': skipped,
        'summary': {
            'total_files_checked': len(referenced_files),
            'total_duration_found': round(total_dur, 1),
            'target_duration': total_duration,
        }
    }

    # ── Print summary ──
    print(f"\n{'=' * 50}")
    print(f"素材验证结果: {'✅ PASSED' if passed else '❌ FAILED'}")
    print(f"{'=' * 50}")
    for check_name, status in checks.items():
        icon = {'ok': '✅', 'warning': '⚠️ ', 'error': '❌'}
        print(f"  {icon.get(status, '❓')} {check_name}: {status}")
    if warnings:
        print(f"\n⚠️  Warnings ({len(warnings)}):")
        for w in warnings:
            print(f"  • {w}")
    if errors:
        print(f"\n❌ Errors ({len(errors)}):")
        for e in errors:
            print(f"  • {e}")
    print(f"\n  检查文件数: {result['summary']['total_files_checked']}")
    print(f"  素材总时长: {result['summary']['total_duration_found']:.1f}s / 目标 {total_duration}s")
    print(f"{'=' * 50}")

    # ── Write report ──
    report_path = os.path.join(output_dir, 'verification_report.json')
    with open(report_path, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"验证报告: {report_path}")

    return passed


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='验证素材完整性，在 ffmpeg concat 前运行')
    parser.add_argument('output_dir', help='输出目录（含 manifest / concat_list / intro/outro）')
    parser.add_argument('total_duration', type=float, help='目标总时长（秒）')
    parser.add_argument('--manifest', default=None, help='manifest_full.json 路径（可选，自动检测）')
    args = parser.parse_args()

    success = verify(args.output_dir, args.total_duration, args.manifest)
    sys.exit(0 if success else 1)
