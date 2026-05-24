#!/usr/bin/env python3
"""
gen_voiceover_omnivoice.py — 使用 OmniVoice API 生成口播音频（声音克隆）。

为 video_config.json 中每个 voiceover 段调用 OmniVoice /generate 接口，
使用已注册的声音克隆 profile，生成连续口播 MP3 + 精确 timing JSON + SRT。

Usage:
    python3 gen_voiceover_omnivoice.py <video_config.json> \\
        --output-dir <output_dir> \\
        --profile-id <profile_id>
"""
import json
import os
import sys
import subprocess
import tempfile
import re
import shutil
import time
from datetime import timedelta
from urllib import request as ureq

API_BASE = "http://127.0.0.1:3900"


def _probe_duration(path: str) -> float:
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


def gen_tts(text: str, profile_id: str, output_path: str) -> float:
    """Call OmniVoice API and return actual duration in seconds."""
    import urllib.parse
    data = urllib.parse.urlencode({
        "text": text,
        "profile_id": profile_id,
        "language": "zh",
    }).encode()
    req = ureq.Request(f"{API_BASE}/generate", data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with ureq.urlopen(req, timeout=300) as resp:
        with open(output_path, "wb") as f:
            f.write(resp.read())

    return _probe_duration(output_path)


def split_sentences(text: str) -> list[str]:
    """Split Chinese text into sentences."""
    sentences = re.split(r'(?<=[。！？])', text)
    return [s.strip() for s in sentences if s.strip()]


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
    output_dir = ""
    profile_id = ""

    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--output-dir" and i + 1 < len(sys.argv):
            output_dir = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--profile-id" and i + 1 < len(sys.argv):
            profile_id = sys.argv[i + 1]
            i += 2
        else:
            i += 1

    if not output_dir:
        print("ERROR: --output-dir is required")
        sys.exit(1)
    if not profile_id:
        print("ERROR: --profile-id is required")
        sys.exit(1)

    with open(config_path) as f:
        cfg = json.load(f)

    voiceover_entries = cfg["audio"]["voiceover"]
    os.makedirs(output_dir, exist_ok=True)
    tmpdir = tempfile.mkdtemp()

    # Step 1: Generate per-segment TTS via OmniVoice
    segments_meta = []
    for i, vo in enumerate(voiceover_entries):
        scene_id = vo["sceneId"]
        text = vo["text"]
        seg_output = os.path.join(tmpdir, f"seg_{i:02d}.wav")

        print(f"  [{i+1}/{len(voiceover_entries)}] OmniVoice TTS: scene={scene_id} ({len(text)} chars)")
        t0 = time.time()
        actual_dur = gen_tts(text, profile_id, seg_output)
        elapsed = time.time() - t0
        print(f"    generated: {actual_dur:.2f}s (took {elapsed:.1f}s)")

        if actual_dur <= 0:
            print(f"    WARNING: Empty audio for segment {i}, skipping")
            continue

        segments_meta.append({
            "scene_id": scene_id,
            "text": text,
            "actual_duration": actual_dur,
            "path": seg_output,
        })

    if not segments_meta:
        print("ERROR: No segments generated")
        shutil.rmtree(tmpdir)
        sys.exit(1)

    # Step 2: Concatenate all segments (continuous, no gaps)
    concat_lines = []
    timing = []
    current_offset = 0.0

    for seg in segments_meta:
        timing.append({
            "scene_id": seg["scene_id"],
            "text": seg["text"],
            "start": current_offset,
            "end": current_offset + seg["actual_duration"],
            "duration": seg["actual_duration"],
        })
        concat_lines.append(f"file '{seg['path']}'")
        current_offset += seg["actual_duration"]

    concat_file = os.path.join(tmpdir, "concat.txt")
    with open(concat_file, "w") as f:
        f.write("\n".join(concat_lines))

    # Concatenate to MP3
    output_path = os.path.join(output_dir, "voiceover.mp3")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        output_path,
    ], capture_output=True, timeout=120)

    # Save timing
    timing_path = os.path.join(output_dir, "voiceover_timing.json")
    with open(timing_path, "w") as f:
        json.dump(timing, f, ensure_ascii=False, indent=2)

    final_dur = _probe_duration(output_path)
    print(f"\nVoiceover generated: {output_path}")
    print(f"  Total duration: {final_dur:.1f}s ({len(segments_meta)} segments)")
    print(f"  Timing: {timing_path}")

    # Step 3: Generate sentence-level SRT
    srt_parts = []
    entry_idx = 1
    for entry in timing:
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

    srt_path = os.path.join(output_dir, "timeline.srt")
    with open(srt_path, "w") as f:
        f.write("\n".join(srt_parts))

    print(f"  SRT: {srt_path} ({entry_idx - 1} sentence-level entries)")

    # Print SRT for preview
    print(f"\n  SRT preview (first 3):")
    for line in "\n".join(srt_parts[:9]).split("\n"):
        print(f"    {line}")

    shutil.rmtree(tmpdir)


if __name__ == "__main__":
    main()
