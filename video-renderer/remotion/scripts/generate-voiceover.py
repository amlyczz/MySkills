#!/usr/bin/env python3
"""
Generate TTS voiceover audio from Blueprint subtitles using MiniMax CLI (mmx-cli).

Usage:
  python3 scripts/generate-voiceover.py <blueprint.json> <output_dir>
  python3 scripts/generate-voiceover.py output/github/2026-05-24/lance/blueprint.json output/github/2026-05-24/lance/materials/
"""
import json, os, sys, subprocess, hashlib, time

BP_PATH = sys.argv[1] if len(sys.argv) > 1 else "blueprint.json"
OUT_DIR = sys.argv[2] if len(sys.argv) > 2 else "output/voiceover/"

os.makedirs(OUT_DIR, exist_ok=True)

# Check if mmx-cli is available
def check_mmx():
    try:
        subprocess.run(["which", "mmx-cli"], capture_output=True, timeout=5)
        return True
    except:
        return False

def generate_tts_fallback(text: str, output_path: str):
    """Use macOS `say` or espeak as fallback when mmx-cli is not available."""
    print(f"  [fallback] No TTS tool found, creating silent placeholder for: {text[:60]}...")
    # Generate 1-second silence per ~5 characters
    duration = max(1, len(text) / 5)
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r=24000:cl=mono",
        "-t", str(duration), output_path
    ], capture_output=True)

def generate_with_mmx(text: str, output_path: str):
    """Use MiniMax CLI to generate TTS."""
    cmd = ["mmx-cli", "tts", text, "--output", output_path]
    print(f"  [mmx] Generating: {text[:60]}...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        print(f"  [mmx] Failed: {result.stderr[:200]}")
        generate_tts_fallback(text, output_path)
    else:
        print(f"  [mmx] OK → {output_path}")

def main():
    with open(BP_PATH) as f:
        bp = json.load(f)

    has_mmx = check_mmx()
    print(f"TTS engine: {'MiniMax CLI' if has_mmx else 'silent placeholder'}")

    for i, scene in enumerate(bp.get("scenes", [])):
        tokens = scene.get("subtitles", {}).get("tokens", [])
        if not tokens:
            continue

        # Build scene voiceover text from subtitle tokens
        scene_text = "".join(t["text"] for t in tokens)
        scene_id = scene.get("id", f"scene-{i}")
        output_file = os.path.join(OUT_DIR, f"{scene_id}.mp3")

        if os.path.exists(output_file):
            print(f"  [{scene_id}] already exists, skip")
            # Update blueprint voiceover audioUrl
            scene.setdefault("voiceover", {})
            scene["voiceover"]["audioUrl"] = output_file
            continue

        if has_mmx:
            generate_with_mmx(scene_text, output_file)
        else:
            generate_tts_fallback(scene_text, output_file)

        # Update blueprint with audio URL
        scene.setdefault("voiceover", {})
        scene["voiceover"]["audioUrl"] = output_file
        scene["voiceover"]["text"] = scene_text
        time.sleep(0.5)  # Rate limit

    # Write updated blueprint
    with open(BP_PATH, "w") as f:
        json.dump(bp, f, ensure_ascii=False, indent=2)
    print(f"\nDone. {len(bp['scenes'])} scenes processed.")

if __name__ == "__main__":
    main()
