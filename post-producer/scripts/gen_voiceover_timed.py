#!/usr/bin/env python3
"""
gen_voiceover_timed.py — 分段 TTS 生成 + 带静默间隙拼接。

为 video_config.json 中每个 voiceover 段单独 TTS 生成，
按场景视频位置插入静音间隙，最终拼接成 scene-aligned voiceover.mp3。

输出：
  - voiceover.mp3（带间隙对齐场景）
  - voiceover_timing.json（每段的实际时间戳）

Usage:
    python3 gen_voiceover_timed.py \\
        <video_config.json> \\
        --output-dir <output_dir> \\
        [--voice-id "Chinese (Mandarin)_Male_Announcer"] \\
        [--pitch 3] [--speed 1.0]
"""
import json
import sys
import os
import subprocess
import tempfile
import shutil
from datetime import timedelta

OUTPUT_DIR = ""


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


def _get_scene_timeline(scene_configs: dict) -> dict[str, float]:
    """Calculate video start position for each scene (matches VideoComposer)."""
    scene_ids = list(scene_configs.keys())
    starts: dict[str, float] = {}
    adjusted_frame = 0
    fps = 30.0
    for i, sid in enumerate(scene_ids):
        cfg = scene_configs[sid]
        dur_secs = cfg.get("durationSeconds", 10)
        starts[sid] = adjusted_frame / fps
        adjusted_frame += dur_secs * fps
        if i < len(scene_ids) - 1:
            next_cfg = scene_configs[scene_ids[i + 1]]
            next_trans = next_cfg.get("transitionIn", {})
            trans_frames = next_trans.get("durationFrames", 0)
            adjusted_frame -= trans_frames
    return starts


def main():
    global OUTPUT_DIR
    config_path = sys.argv[1] if len(sys.argv) > 1 else "video_config.json"
    voice_id = "Chinese (Mandarin)_Male_Announcer"
    pitch = 3
    speed = 1.0

    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--output-dir" and i + 1 < len(sys.argv):
            OUTPUT_DIR = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--voice-id" and i + 1 < len(sys.argv):
            voice_id = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--pitch" and i + 1 < len(sys.argv):
            pitch = int(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == "--speed" and i + 1 < len(sys.argv):
            speed = float(sys.argv[i + 1])
            i += 2
        else:
            i += 1

    if not OUTPUT_DIR:
        print("ERROR: --output-dir is required")
        sys.exit(1)

    with open(config_path) as f:
        cfg = json.load(f)

    voiceover_entries = cfg["audio"]["voiceover"]
    scene_configs = cfg["sceneConfigs"]
    scene_starts = _get_scene_timeline(scene_configs)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    tmpdir = tempfile.mkdtemp()

    # Step 1: Generate per-segment TTS + collect metadata
    segments_meta = []
    for i, vo in enumerate(voiceover_entries):
        scene_id = vo["sceneId"]
        text = vo["text"]
        # 使用场景视频位置作为目标开始时间
        target_start = scene_starts.get(scene_id, 0)

        seg_output = os.path.join(tmpdir, f"seg_{i:02d}.mp3")
        print(f"  [{i + 1}/{len(voiceover_entries)}] TTS: scene={scene_id} text='{text[:30]}...'")

        cmd = [
            "mmx", "speech", "synthesize",
            "--text", text,
            "--voice", voice_id,
            "--speed", str(speed),
            "--out", seg_output,
            "--quiet",
        ]
        if pitch != 0:
            cmd.extend(["--pitch", str(pitch)])

        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            print(f"  WARNING: TTS failed for segment {i}: {result.stderr.decode()[-200:]}")
            continue

        actual_dur = _probe_duration(seg_output)
        if actual_dur <= 0:
            print(f"  WARNING: Empty audio for segment {i}")
            continue

        segments_meta.append({
            "scene_id": scene_id,
            "text": text,
            "target_start": target_start,
            "actual_duration": actual_dur,
            "path": seg_output,
        })
        print(f"    actual={actual_dur:.2f}s target_start={target_start:.1f}s")

    if not segments_meta:
        print("ERROR: No segments generated")
        shutil.rmtree(tmpdir)
        sys.exit(1)

    # Step 2: Build concat file with silence gaps
    concat_lines = []
    current_offset = 0.0
    timing = []

    for seg in segments_meta:
        # Insert silence to push to target start
        gap = seg["target_start"] - current_offset
        if gap > 0.01:
            silence_file = os.path.join(tmpdir, f"silence_{len(timing):02d}.mp3")
            _run([
                "ffmpeg", "-y",
                "-f", "lavfi", "-i", f"anullsrc=r=24000:cl=mono",
                "-t", str(gap),
                "-c:a", "libmp3lame",
                silence_file,
            ])
            concat_lines.append(f"file '{silence_file}'")
            current_offset += gap

        timing.append({
            "scene_id": seg["scene_id"],
            "text": seg["text"],
            "start": current_offset,
            "end": current_offset + seg["actual_duration"],
            "duration": seg["actual_duration"],
        })
        concat_lines.append(f"file '{seg['path']}'")
        current_offset += seg["actual_duration"]

    # Save concat list
    concat_file = os.path.join(tmpdir, "concat.txt")
    with open(concat_file, "w") as f:
        f.write("\n".join(concat_lines))

    # Concatenate
    output_path = os.path.join(OUTPUT_DIR, "voiceover.mp3")
    _run([
        "ffmpeg", "-y", "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c:a", "libmp3lame",
        output_path,
    ])

    # Save timing metadata
    timing_path = os.path.join(OUTPUT_DIR, "voiceover_timing.json")
    with open(timing_path, "w") as f:
        json.dump(timing, f, ensure_ascii=False, indent=2)

    final_dur = _probe_duration(output_path)
    print(f"\nVoiceover generated: {output_path}")
    print(f"  Total duration: {final_dur:.1f}s ({len(segments_meta)} segments)")
    print(f"  Timing: {timing_path}")

    # Print SRT-compatible output
    print(f"\n  SRT timing:")
    for i, t in enumerate(timing):
        print(f"  {i + 1}")
        print(f"  {fmt_time(t['start'])} --> {fmt_time(t['end'])}")
        print(f"  {t['text']}")
        print()

    shutil.rmtree(tmpdir)


def _run(cmd, timeout=120):
    result = subprocess.run(cmd, capture_output=True, timeout=timeout)
    if result.returncode != 0:
        stderr = result.stderr.decode()[-500:]
        print(f"  FFMPEG WARNING: {' '.join(cmd[:4])}... {stderr[-100:]}")
    return result


def fmt_time(t: float) -> str:
    td = timedelta(seconds=t)
    total_secs = int(td.total_seconds())
    h = total_secs // 3600
    m = (total_secs % 3600) // 60
    s = total_secs % 60
    ms = int(round((t - int(t)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


if __name__ == "__main__":
    main()
