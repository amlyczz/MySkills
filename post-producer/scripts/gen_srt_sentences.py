#!/usr/bin/env python3
"""
gen_srt_sentences.py — 句子级字幕生成。

将每段 voiceover 的文本拆分为独立句子，每句单独 SRT 条目，
按字符数比例分配该段总时长，实现字幕逐句对应口播。

Usage:
    python3 gen_srt_sentences.py <video_config.json> <output.srt> \\
        [--timing voiceover_timing.json]
"""
import json
import os
import re
import sys
from datetime import timedelta


def fmt_time(t: float) -> str:
    td = timedelta(seconds=t)
    total_secs = int(td.total_seconds())
    h = total_secs // 3600
    m = (total_secs % 3600) // 60
    s = total_secs % 60
    ms = int(round((t - int(t)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def split_sentences(text: str) -> list[str]:
    """Split Chinese text into sentences at 。！？ separators."""
    sentences = re.split(r'(?<=[。！？])', text)
    return [s.strip() for s in sentences if s.strip()]


def main():
    config_path = sys.argv[1] if len(sys.argv) > 1 else "video_config.json"
    output_path = sys.argv[2] if len(sys.argv) > 2 else "timeline.srt"

    timing_path = None
    for i, arg in enumerate(sys.argv):
        if arg == "--timing" and i + 1 < len(sys.argv):
            timing_path = sys.argv[i + 1]

    with open(config_path) as f:
        cfg = json.load(f)

    voiceover_entries = cfg["audio"]["voiceover"]

    if timing_path and os.path.exists(timing_path):
        print(f"  Using exact timing from: {timing_path}")
        with open(timing_path) as f:
            timing_data = json.load(f)
        # Use segment-level timing and split sentences within each
        srt_parts = []
        entry_idx = 1
        for entry in timing_data:
            text = entry["text"]
            seg_start = entry["start"]
            seg_end = entry["end"]
            seg_dur = seg_end - seg_start

            sentences = split_sentences(text)
            if not sentences:
                continue

            total_chars = sum(len(s) for s in sentences)
            if total_chars == 0:
                continue

            cursor = seg_start
            for sent in sentences:
                # Proportional time allocation based on character count
                sent_ratio = len(sent) / total_chars
                sent_dur = seg_dur * sent_ratio
                sent_end = cursor + sent_dur

                srt_parts.append(
                    f"{entry_idx}\n"
                    f"{fmt_time(cursor)} --> {fmt_time(sent_end)}\n"
                    f"{sent}\n"
                )
                entry_idx += 1
                cursor = sent_end

        with open(output_path, "w") as f:
            f.write("\n".join(srt_parts))

        total_subs = entry_idx - 1
        print(f"  Written: {output_path} ({total_subs} sentence-level entries)")
        print(f"  Average subtitle duration: {seg_dur / total_subs:.1f}s")
    else:
        print("  WARNING: No timing file provided. Using estimated durations.")
        srt_parts = []
        entry_idx = 1
        cumulative = 0.0
        for vo in voiceover_entries:
            dur = vo.get("durationSeconds", 1)
            text = vo["text"]
            seg_start = cumulative
            seg_end = cumulative + dur

            sentences = split_sentences(text)
            if not sentences:
                cumulative += dur
                continue

            total_chars = sum(len(s) for s in sentences)
            if total_chars == 0:
                cumulative += dur
                continue

            cursor = seg_start
            for sent in sentences:
                sent_ratio = len(sent) / total_chars
                sent_dur = dur * sent_ratio
                sent_end = cursor + sent_dur

                srt_parts.append(
                    f"{entry_idx}\n"
                    f"{fmt_time(cursor)} --> {fmt_time(sent_end)}\n"
                    f"{sent}\n"
                )
                entry_idx += 1
                cursor = sent_end

            cumulative += dur

        with open(output_path, "w") as f:
            f.write("\n".join(srt_parts))

        total_subs = entry_idx - 1
        print(f"  Written: {output_path} ({total_subs} sentence-level entries)")


if __name__ == "__main__":
    main()
