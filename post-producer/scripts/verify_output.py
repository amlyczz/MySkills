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


def _run_check(name: str, is_error: bool, fn, errors: list, warnings: list) -> str:
    """Run a single verification check. Returns 'ok', 'warning', or 'error'."""
    try:
        ok, msg = fn()
    except Exception as e:
        ok, msg = False, str(e)

    if ok:
        return 'ok'
    if is_error:
        errors.append(msg)
        return 'error'
    else:
        warnings.append(msg)
        return 'warning'


def _find_manifest(output_dir: str) -> str | None:
    for d in [output_dir, os.path.dirname(output_dir)]:
        candidates = [f for f in os.listdir(d) if f.endswith('manifest_full.json')]
        if candidates:
            return os.path.join(d, candidates[0])
    return None


def _load_manifest(path: str | None) -> list:
    if not path or not os.path.isfile(path):
        return []
    try:
        with open(path) as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and 'entries' in data:
            return data['entries']
    except Exception:
        pass
    return []


def verify(output_dir, total_duration, manifest_path=None):
    """Run all verification checks and return results."""
    output_dir = os.path.abspath(output_dir)
    errors: list[str] = []
    warnings: list[str] = []
    checks: dict[str, str] = {}

    manifest_path = manifest_path or _find_manifest(output_dir)
    if manifest_path:
        print(f"  Manifest: {manifest_path}")
    manifest = _load_manifest(manifest_path)

    # Collect referenced files
    concat_files: list[str] = []
    referenced_files: list[str] = []
    concat_path = os.path.join(output_dir, 'concat_list.txt')
    if os.path.isfile(concat_path):
        with open(concat_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("file '"):
                    name = line[6:-1]
                    concat_files.append(name)
                    referenced_files.append(os.path.join(output_dir, name))
    for entry in manifest:
        if isinstance(entry, dict) and 'path' in entry:
            if entry['path'] not in concat_files:
                referenced_files.append(os.path.join(output_dir, entry['path']))

    total_dur = 0  # computed in check 6, used in summary

    # ── 8 checks as callable list ──
    check_list = [
        ('intro', True, lambda: (
            check_file_exists(os.path.join(output_dir, 'intro.mp4')) and
            check_file_decodable(os.path.join(output_dir, 'intro.mp4')),
            f"intro.mp4 缺失或不可解码"
        )),
        ('outro', True, lambda: (
            check_file_exists(os.path.join(output_dir, 'outro.mp4')) and
            check_file_decodable(os.path.join(output_dir, 'outro.mp4')),
            f"outro.mp4 缺失或不可解码"
        )),
        ('files_exist', True, lambda: (
            all(os.path.isfile(f) for f in referenced_files),
            f"文件缺失: {', '.join(os.path.basename(f) for f in referenced_files if not os.path.isfile(f))}"
        ) if referenced_files else (True, '')),
        ('images', False, lambda: (
            not (issues := [e['path'] for e in manifest if e.get('type') == 'image' and
                  os.path.isfile(os.path.join(output_dir, e['path'])) and
                  not check_file_decodable(os.path.join(output_dir, e['path']))]),
            f"图片不可解码: {', '.join(issues)}" if issues else ''
        )),
        ('duration', True, lambda: (
            not (zeros := [e['path'] for e in manifest if e.get('type') in
                  ('scroll_video', 'extracted_video', 'link_video') and
                  os.path.isfile(os.path.join(output_dir, e['path'])) and
                  get_video_duration(os.path.join(output_dir, e['path'])) <= 0]),
            f"视频时长为0: {', '.join(zeros)}" if zeros else ''
        )),
        ('total_duration', False, lambda: (
            (dur := sum(get_video_duration(f) for f in referenced_files
             if os.path.isfile(f) and os.path.splitext(f)[1].lower() in ('.mp4', '.webm', '.mov', '.mkv'))) and
            not (globals().__setitem__('total_dur', dur) or True),
            f"素材总时长 {dur:.1f}s 不足目标 50% ({total_duration * 0.5:.1f}s)"
        ) if (dur := sum(get_video_duration(f) for f in referenced_files
             if os.path.isfile(f) and os.path.splitext(f)[1].lower() in ('.mp4', '.webm', '.mov', '.mkv'))) < total_duration * 0.5
             else (True, '')),
        ('concat_syntax', True, lambda: (
            os.path.isfile(concat_path) and check_concat_syntax(concat_path),
            "concat_list.txt 不存在或语法有误"
        )),
        ('codec', False, lambda: (
            not (mismatches := [
                f"{os.path.basename(f)} ({c})" for f in referenced_files
                if os.path.isfile(f) and os.path.splitext(f)[1].lower() in ('.mp4', '.webm', '.mov')
                and (c := get_video_codec(f)) not in ('h264', 'unknown')
            ]),
            f"编码非H264: {', '.join(mismatches)}" if mismatches else ''
        )),
    ]

    for name, is_error, fn in check_list:
        checks[name] = _run_check(name, is_error, fn, errors, warnings)

    # ── Result ──
    passed = len(errors) == 0
    total_dur = total_dur or sum(get_video_duration(f) for f in referenced_files
        if os.path.isfile(f) and os.path.splitext(f)[1].lower() in ('.mp4', '.webm', '.mov', '.mkv'))

    result = {
        'passed': passed,
        'checks': checks,
        'warnings': warnings,
        'errors': errors,
        'skipped_materials': [],
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
    for label, items in [('Warnings', warnings), ('Errors', errors)]:
        if items:
            print(f"\n{icon_for(label)} {label} ({len(items)}):")
            for item in items:
                print(f"  • {item}")
    print(f"\n  检查文件数: {result['summary']['total_files_checked']}")
    print(f"  素材总时长: {result['summary']['total_duration_found']:.1f}s / 目标 {total_duration}s")
    print(f"{'=' * 50}")

    report_path = os.path.join(output_dir, 'verification_report.json')
    with open(report_path, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"验证报告: {report_path}")

    return passed


def icon_for(label: str) -> str:
    return '⚠️' if label == 'Warnings' else '❌'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='验证素材完整性，在 ffmpeg concat 前运行')
    parser.add_argument('output_dir', help='输出目录（含 manifest / concat_list / intro/outro）')
    parser.add_argument('total_duration', type=float, help='目标总时长（秒）')
    parser.add_argument('--manifest', default=None, help='manifest_full.json 路径（可选，自动检测）')
    args = parser.parse_args()

    success = verify(args.output_dir, args.total_duration, args.manifest)
    sys.exit(0 if success else 1)
