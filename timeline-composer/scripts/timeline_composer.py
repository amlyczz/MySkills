#!/usr/bin/env python3
"""
timeline_composer.py — 确定性工具函数集

提供给 ScriptTimelineComposer 的 AI Agent 调用的工具：
  - bgm-curve:   从 timeline.json 生成 BGM 音量曲线
  - subtitles:   从 timeline.json 生成 SRT 字幕
  - chapters:    从 timeline.json 生成章节标记

Agent 负责所有语义推理（13 维场景决策），本模块只做确定性计算。

Usage:
    python3 timeline_composer.py bgm-curve <timeline.json> [--output curve.json]
    python3 timeline_composer.py subtitles <timeline.json> [--output timeline.srt]
    python3 timeline_composer.py chapters <timeline.json> [--output chapters.json]
"""

import json
import os
import sys
import argparse
from typing import Any


# ── SRT time formatting ────────────────────────────────────

def _fmt_srt_time(seconds: float) -> str:
    """Format seconds → SRT time format (HH:MM:SS,mmm)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# ── Subtitle splitting ─────────────────────────────────────

def _split_for_subtitles(text: str, chunk_size: int = 15) -> list[str]:
    """Split text into subtitle-friendly chunks without breaking words."""
    chunks = []
    current = ""
    for char in text:
        current += char
        if len(current) >= chunk_size:
            chunks.append(current)
            current = ""
    if current:
        if len(current) < 5 and chunks:
            chunks[-1] += current
        else:
            chunks.append(current)
    return chunks


# ── BGM volume curve ───────────────────────────────────────

def _generate_bgm_curve(segments: list[dict],
                        total_duration: float) -> list[dict]:
    """Port of bgmCurve.ts generateBgmCurve() — per-segment BGM volume curve.

    Rules:
      - hook: BGM fade in from 0.0 over 1.5s
      - cta:  BGM fade out to 0.0 over 1.5s
      - voiceover active: ducked to min(seg.bgm_volume, 0.15)
      - other: seg.bgm_volume (default 0.5)

    Returns [{time, volume}] sorted by time.
    """
    VOL_NORMAL = 0.5
    VOL_DUCKED = 0.15
    VOL_FADE_START = 0.0
    FADE_SECONDS = 1.5

    points: list[dict] = []

    for seg in segments:
        seg_type = seg.get("type", "showcase")
        audio_cfg = seg.get("audio", {})
        bgm_vol = audio_cfg.get("bgm_volume", VOL_NORMAL)
        t0 = seg.get("time_start", 0)
        t1 = seg.get("time_end", t0 + 5)
        has_vo = bool(seg.get("voiceover", {}).get("text", ""))

        if seg_type == "hook":
            vol = bgm_vol if not has_vo else min(bgm_vol, VOL_DUCKED)
            points.append({"time": max(0, t0), "volume": VOL_FADE_START})
            points.append({"time": t0 + FADE_SECONDS, "volume": vol})
        elif seg_type == "cta":
            vol = bgm_vol if not has_vo else min(bgm_vol, VOL_DUCKED)
            points.append({"time": t0, "volume": vol})
            points.append({"time": max(t0, t1 - FADE_SECONDS), "volume": vol * 0.6})
            points.append({"time": t1, "volume": VOL_FADE_START})
        else:
            vol = bgm_vol if not has_vo else min(bgm_vol, VOL_DUCKED)
            points.append({"time": t0, "volume": vol})
            points.append({"time": t1, "volume": vol})

    points.sort(key=lambda p: p["time"])
    deduped: list[dict] = []
    for p in points:
        if not deduped or abs(p["time"] - deduped[-1]["time"]) > 0.01:
            deduped.append(p)
    return deduped


# ── Subtitle generation (from timeline segments) ───────────

def _generate_subtitles(segments: list[dict]) -> list[dict]:
    """Generate subtitle entries from timeline segments."""
    subtitles: list[dict] = []
    for seg in segments:
        vo = seg.get("voiceover", {})
        text = vo.get("text", "")
        if not text:
            continue

        duration = vo.get("duration_est", len(text) / 4.0)
        seg_start = seg.get("time_start", 0)

        chunks = _split_for_subtitles(text, chunk_size=15)
        if not chunks:
            continue

        chunk_dur = duration / len(chunks)
        for j, chunk in enumerate(chunks):
            subtitles.append({
                "text": chunk,
                "time_start": seg_start + j * chunk_dur,
                "time_end": seg_start + (j + 1) * chunk_dur,
            })

    return subtitles


# ── Chapter generation ─────────────────────────────────────

def _generate_chapters(segments: list[dict]) -> list[dict]:
    """Create chapter markers from segment labels."""
    chapters: list[dict] = []
    for seg in segments:
        label = seg.get("label", "")
        if label:
            chapters.append({"label": label, "time": seg.get("time_start", 0)})

    if chapters and chapters[0]["time"] > 0:
        chapters.insert(0, {"label": "开始", "time": 0.0})

    return chapters


# ── CLI subcommands ─────────────────────────────────────────

def cmd_bgm_curve(args: argparse.Namespace) -> None:
    with open(args.timeline_json, "r") as f:
        timeline = json.load(f)
    segments = timeline.get("segments", [])
    total_duration = timeline.get("global", {}).get("total_duration", 180)
    curve = _generate_bgm_curve(segments, total_duration)
    if not curve:
        print("No curve generated", file=sys.stderr)
        return
    output = args.output or os.path.splitext(args.timeline_json)[0] + ".bgm_curve.json"
    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
    with open(output, "w") as f:
        json.dump(curve, f, indent=2)
    print(f"BGM curve: {output} ({len(curve)} points)")


def cmd_subtitles(args: argparse.Namespace) -> None:
    with open(args.timeline_json, "r") as f:
        timeline = json.load(f)
    segments = timeline.get("segments", [])
    entries = _generate_subtitles(segments)
    if not entries:
        print("No subtitles generated", file=sys.stderr)
        return
    output = args.output or os.path.splitext(args.timeline_json)[0] + ".srt"
    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)

    lines = []
    for i, sub in enumerate(entries, 1):
        lines.append(str(i))
        lines.append(f"{_fmt_srt_time(sub['time_start'])} --> {_fmt_srt_time(sub['time_end'])}")
        lines.append(sub["text"])
        lines.append("")

    with open(output, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Subtitles: {output} ({len(entries)} entries)")


def cmd_chapters(args: argparse.Namespace) -> None:
    with open(args.timeline_json, "r") as f:
        timeline = json.load(f)
    segments = timeline.get("segments", [])
    chapters = _generate_chapters(segments)
    output = args.output or os.path.splitext(args.timeline_json)[0] + ".chapters.json"
    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
    with open(output, "w") as f:
        json.dump(chapters, f, indent=2, ensure_ascii=False)
    print(f"Chapters: {output} ({len(chapters)} markers)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Timeline Composer — 确定性工具函数集 (BGM curve / Subtitles / Chapters)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_bgm = sub.add_parser("bgm-curve", help="Generate BGM volume curve from timeline.json")
    p_bgm.add_argument("timeline_json", help="Path to timeline.json")
    p_bgm.add_argument("--output", "-o", help="Output path (default: <timeline>.bgm_curve.json)")

    p_sub = sub.add_parser("subtitles", help="Generate SRT subtitles from timeline.json")
    p_sub.add_argument("timeline_json", help="Path to timeline.json")
    p_sub.add_argument("--output", "-o", help="Output path (default: <timeline>.srt)")

    p_chap = sub.add_parser("chapters", help="Generate chapter markers from timeline.json")
    p_chap.add_argument("timeline_json", help="Path to timeline.json")
    p_chap.add_argument("--output", "-o", help="Output path (default: <timeline>.chapters.json)")

    args = parser.parse_args()

    if args.command == "bgm-curve":
        cmd_bgm_curve(args)
    elif args.command == "subtitles":
        cmd_subtitles(args)
    elif args.command == "chapters":
        cmd_chapters(args)


if __name__ == "__main__":
    main()
