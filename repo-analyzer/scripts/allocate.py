#!/usr/bin/env python3
"""
allocate.py (v5) — Phase 1: 素材清单加载与验证（精简版）

职责:
  1. 委托 manifest_validator 完成素材清单加载与验证
  2. 不再渲染 intro/outro（组件已删除）
  3. 不再写入或生成 video_config.json（由 Phase 2 唯一产出）
  4. build_video_config() 已删除（Phase 2 Agent 驱动替代）

Usage:
    python3 allocate.py <manifest> <total_duration> [--output-dir DIR]
                       [--content-dir DIR] [--bg-type TYPE] [--strict]
"""

import json
import sys
import os
import argparse

from manifest_validator import validate_manifest, MATERIAL_TYPE_ENUM
from pipeline_contracts.enums import STYLES, STRUCTURES


def allocate(manifest_path, total_time, output_dir, content_dir=None,
             repo_url=None, bg_type='starfield', strict=False,
             manual_images=None, manual_videos=None):
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
    allocate(args.manifest, args.total_duration, args.output_dir,
             args.content_dir, args.repo_url, args.bg_type,
             strict=args.strict,
             manual_images=args.manual_image, manual_videos=args.manual_video)
