#!/usr/bin/env python3
"""
gen_srt.py — Generate SRT subtitle file from video_config.json voiceover entries.

Each subtitle shows at the scene's video position for exactly the voiceover
segment's duration, matching VideoComposer's per-scene voiceover playback timing.

Usage:
    python3 gen_srt.py <video_config.json> <output.srt> [--voiceover voiceover.mp3]
"""
import json
import sys
import os
import subprocess
from datetime import timedelta


def _probe_duration(path: str) -> float:
    """Get audio duration via ffprobe."""
    if not os.path.exists(path):
        return 0.0
    res = subprocess.run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path,
    ], capture_output=True, text=True, timeout=30)
    try:
        return float(res.stdout.strip())
    except ValueError:
        return 0.0


def fmt_time(t: float) -> str:
    td = timedelta(seconds=t)
    total_secs = int(td.total_seconds())
    h = total_secs // 3600
    m = (total_secs % 3600) // 60
    s = total_secs % 60
    ms = int(round((t - int(t)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    config_path = sys.argv[1] if len(sys.argv) > 1 else "video_config.json"
    output_path = sys.argv[2] if len(sys.argv) > 2 else "timeline.srt"

    with open(config_path) as f:
        cfg = json.load(f)

    voiceover_entries = cfg["audio"]["voiceover"]

    # ── 用实际语音文件时长校准 ──
    # estimated_duration 来自 video_config.json 的 durationSeconds 累加
    # actual_duration 来自 ffprobe 探测 voiceover.mp3
    # 校准系数 = actual / estimated，所有字幕段等比例缩放
    estimated_total = sum(vo.get("durationSeconds", 1) for vo in voiceover_entries)
    voiceover_path = None
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--voiceover" and i < len(sys.argv):
            voiceover_path = sys.argv[i + 1]
            break
    if voiceover_path and os.path.exists(voiceover_path):
        actual_total = _probe_duration(voiceover_path)
        scale = actual_total / estimated_total if estimated_total > 0 else 1.0
        print(f"  Voiceover calibration: estimated={estimated_total:.1f}s actual={actual_total:.1f}s scale={scale:.4f}")
    else:
        scale = 1.0
        print(f"  Voiceover file not provided, using estimated durations (scale=1.0)")

    # ── 字幕时间 = 连续累计偏移（已校准） ──
    # audio_mixer.py 把 voiceover.mp3 从 0s 连续混入最终视频，
    # 所以字幕必须按连续累计时间定位，而不是按场景视频位置。
    cumulative = 0.0
    srt_parts = []
    for i, vo in enumerate(voiceover_entries):
        dur_raw = vo.get("durationSeconds", 1)
        dur = dur_raw * scale  # 等比例缩放
        t_start = cumulative
        t_end = t_start + dur
        cumulative += dur

        srt_parts.append(f"""{i + 1}
{fmt_time(t_start)} --> {fmt_time(t_end)}
{vo['text']}
""")

    with open(output_path, "w") as f:
        f.write("\n".join(srt_parts))

    print(f"Written: {output_path} ({len(voiceover_entries)} entries)")


if __name__ == "__main__":
    main()
