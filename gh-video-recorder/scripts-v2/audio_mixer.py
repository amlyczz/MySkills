#!/usr/bin/env python3
"""
audio_mixer.py — Layer 4: audio mixing + final composition.

Pipeline:
    1. Read timeline.json → per-segment BGM volume + SFX triggers
    2. Voiceover: normalize to -16 LUFS
    3. BGM: apply segment-level volume envelope + head/tail fades
    4. Sidechain ducking: BGM dips when voiceover is active
    5. SFX: place at specific time points with volume
    6. Mix all → mux with video → final.mp4

Usage:
    python3 audio_mixer.py video.mp4 voiceover.mp3 bgm.mp3 timeline.json \\
        --output final.mp4 --sfx-dir sfx/
"""

import os
import sys
import json
import subprocess
import argparse
import tempfile
import shutil


def _run(cmd: list[str], timeout: int = 600) -> subprocess.CompletedProcess:
    """Run a subprocess, raise on failure with stderr context."""
    result = subprocess.run(cmd, capture_output=True, timeout=timeout)
    if result.returncode != 0:
        stderr = result.stderr.decode()[-2000:] if result.stderr else ""
        raise RuntimeError(f"Command failed (exit {result.returncode}):\n{' '.join(cmd[:8])}...\n{stderr}")
    return result


def _probe_duration(path: str) -> float:
    """Get media duration via ffprobe."""
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


def _gen_bgm_volume_curve(segments: list[dict], total_duration: float,
                          offset: float = 0.5, tail: float = 1.0) -> str:
    r"""Generate a ffmpeg volume expression string for the BGM track.

    The curve is piecewise-constant per segment with linear crossfade at boundaries.

    Returns a string usable in ffmpeg's `volume='...':eval=frame` filter.
    """
    if not segments:
        return "0"

    total = total_duration + offset + tail
    parts: list[str] = []

    # Fade-in: 0 → first_seg_vol (linear over `offset` seconds)
    first_vol = segments[0].get("audio", {}).get("bgm_volume", 0.25)
    parts.append(f"if(lt(t,{offset}),{first_vol}*t/{offset}")

    prev_vol = first_vol
    prev_end = offset

    for seg in segments:
        t0 = seg.get("time_start", 0) + offset
        t1 = seg.get("time_end", t0 + 1) + offset
        vol = seg.get("audio", {}).get("bgm_volume", 0.25)
        fade_in = seg.get("audio", {}).get("bgm_fade_in", 0)
        fade_out = seg.get("audio", {}).get("bgm_fade_out", 0)

        if t0 > prev_end:
            # Gap between segments: hold prev_vol
            parts.append(f",if(lt(t,{t0}),{prev_vol}")

        if fade_in > 0 and t0 + fade_in < t1:
            parts.append(
                f",if(lt(t,{t0 + fade_in}),"
                f"{prev_vol}+({vol}-{prev_vol})*(t-{t0})/{fade_in}"
            )

        if fade_out > 0 and t1 - fade_out > t0:
            fade_start = t1 - fade_out
            parts.append(
                f",if(lt(t,{fade_start}),{vol}"
                f",if(lt(t,{t1}),{vol}*(1-(t-{fade_start})/{fade_out})"
            )
        else:
            parts.append(f",if(lt(t,{t1}),{vol}")

        prev_vol = vol
        prev_end = t1

    # Fade-out: last_vol → 0
    tail_start = total_duration + offset
    last_vol = segments[-1].get("audio", {}).get("bgm_volume", 0.25)
    parts.append(f",if(lt(t,{tail_start}),{last_vol}")
    parts.append(f",if(lt(t,{total}),{last_vol}*(1-(t-{tail_start})/{tail})")

    # Everything beyond total → 0, close all ifs
    parts.append(",0")
    parts.append(")" * len(parts))

    return "".join(parts)


def _extract_sfx(segments: list[dict], sfx_dir: str | None) -> list[dict]:
    """Collect SFX triggers from timeline segments."""
    if not sfx_dir or not os.path.isdir(sfx_dir):
        return []
    triggers: list[dict] = []
    for seg in segments:
        sfx_list = seg.get("audio", {}).get("sfx", [])
        t_seg = seg.get("time_start", 0)
        t_end = seg.get("time_end", 0)
        for sfx in sfx_list:
            sfx_id = sfx.get("id", "")
            t = t_seg + sfx.get("time", 0)
            vol = sfx.get("volume", 0.5)
            repeat = sfx.get("repeat_every")
            path = _find_sfx(sfx_id, sfx_dir)
            if not path:
                continue
            triggers.append({"path": path, "time": t, "volume": vol})
            if repeat and repeat > 0:
                t_next = t + repeat
                while t_next < t_end:
                    triggers.append({"path": path, "time": t_next, "volume": vol})
                    t_next += repeat
    return sorted(triggers, key=lambda x: x["time"])


def _find_sfx(sfx_id: str, sfx_dir: str) -> str | None:
    for ext in (".mp3", ".wav", ".ogg"):
        p = os.path.join(sfx_dir, f"{sfx_id}{ext}")
        if os.path.isfile(p):
            return p
    return None


# ── Main mix function ───────────────────────────────────────

def mix_audio(video_path: str,
              voiceover_path: str,
              bgm_path: str,
              timeline_path: str,
              output_path: str = "final.mp4",
              sfx_dir: str | None = None,
              bgm_offset: float = 0.5,
              bgm_tail: float = 1.0) -> str:
    """Mix audio and produce final video."""

    with open(timeline_path, "r") as f:
        timeline = json.load(f)

    total_dur = timeline["global"]["total_duration"]
    segments = timeline.get("segments", [])
    global_bgm = timeline["global"].get("bgm_volume", 0.2)

    vo_dur = _probe_duration(voiceover_path)
    bgm_dur = _probe_duration(bgm_path)
    print(f"Voiceover: {vo_dur:.1f}s  BGM: {bgm_dur:.1f}s  Target: {total_dur:.1f}s")

    total_bgm = total_dur + bgm_offset + bgm_tail

    sfx_triggers = _extract_sfx(segments, sfx_dir)
    print(f"  SFX: {len(sfx_triggers)} triggers")

    # Build filter_complex
    filters: list[str] = []

    # [0:v] video  [1:a] voiceover  [2:a] bgm  [3+...:a] sfx files
    vo_idx = 1
    bgm_idx = 2

    # ── Voiceover ────────────────────────────────────────────
    filters.append(
        f"[{vo_idx}:a]atrim=0:{total_dur},"
        f"loudnorm=I=-16:TP=-1.5:LRA=11:linear=true[vo_norm]"
    )

    # ── BGM ──────────────────────────────────────────────────
    vol_curve = _gen_bgm_volume_curve(segments, total_dur, bgm_offset, bgm_tail)
    filters.append(
        f"[{bgm_idx}:a]atrim=0:{min(bgm_dur, total_bgm)},"
        f"apad=whole_len={total_bgm},"
        f"volume='{vol_curve}':eval=frame,"
        f"volume={global_bgm}[bgm_vol]"
    )

    # ── Sidechain ducking ────────────────────────────────────
    # BGM dips ~8dB when voiceover is above threshold
    filters.append(
        f"[bgm_vol][vo_norm]sidechaincompress="
        f"threshold=0.005:ratio=2:attack=10:release=100[bgm_ducked]"
    )

    # ── Mix voiceover + BGM ──────────────────────────────────
    filters.append(
        f"[bgm_ducked][vo_norm]amix=inputs=2:duration=first:weights=1 1[mixed]"
    )

    # ── SFX overlay ──────────────────────────────────────────
    last_label = "[mixed]"
    sfx_input_idx = 3  # after video, vo, bgm
    for i, sfx in enumerate(sfx_triggers):
        src_idx = sfx_input_idx + i
        sfx_label = f"[sfx{i}]"
        dur = _probe_duration(sfx["path"])
        vol = sfx["volume"]
        t = sfx["time"]
        # Pad silence before, then mix
        filters.append(
            f"[{src_idx}:a]adelay={int(t * 1000)}|{int(t * 1000)},"
            f"atrim=0:{total_dur},volume={vol}{sfx_label}"
        )
        mix_label = f"[mixsfx{i}]"
        filters.append(
            f"{last_label}{sfx_label}amix=inputs=2:duration=first:weights=1 1{mix_label}"
        )
        last_label = mix_label

    final_audio = "[final_a]"
    filters.append(f"{last_label}volume=1.0{final_audio}")

    filter_complex = ";".join(filters)

    # Build ffmpeg command
    inputs = [video_path, voiceover_path, bgm_path]
    input_args: list[str] = []
    for p in inputs:
        input_args += ["-i", p]
    for sfx in sfx_triggers:
        input_args += ["-i", sfx["path"]]

    cmd = [
        "ffmpeg", "-y",
        *input_args,
        "-filter_complex", filter_complex,
        "-map", "0:v",
        "-map", final_audio,
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        os.path.abspath(output_path),
    ]

    print(f"  Mixing ({len(segments)} segs, {len(sfx_triggers)} SFX)...")
    _run(cmd)

    return os.path.abspath(output_path)


# ── CLI ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Layer 4: Audio mixing + final composition")
    parser.add_argument("video", help="Input video (Remotion render)")
    parser.add_argument("voiceover", help="Voiceover audio file")
    parser.add_argument("bgm", help="Background music file")
    parser.add_argument("timeline", help="timeline.json path")
    parser.add_argument("--output", "-o", default="final.mp4", help="Output video path")
    parser.add_argument("--sfx-dir", default=None, help="Directory with SFX files")
    parser.add_argument("--bgm-offset", type=float, default=0.5,
                        help="Silence before BGM starts (default: 0.5s)")
    parser.add_argument("--bgm-tail", type=float, default=1.0,
                        help="Silence after BGM fade-out (default: 1.0s)")
    args = parser.parse_args()

    output = mix_audio(
        video_path=args.video,
        voiceover_path=args.voiceover,
        bgm_path=args.bgm,
        timeline_path=args.timeline,
        output_path=args.output,
        sfx_dir=args.sfx_dir,
        bgm_offset=args.bgm_offset,
        bgm_tail=args.bgm_tail,
    )
    print(f"Final video: {output}")


if __name__ == "__main__":
    main()
