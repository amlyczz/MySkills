"""media_generation CLI — 视频管线音频生成入口。

Usage:
    python -m media_generation voiceover \\
        --text "欢迎收看今天的项目" \\
        --voice-id male-tech-01 \\
        --output voiceover.mp3

    python -m media_generation voiceover \\
        --from-content content.json \\
        --voice-id female-tech-01 \\
        --output voiceover.mp3

    python -m media_generation bgm \\
        --prompt "ambient electronic" \\
        --duration 180 \\
        --output bgm.mp3
"""

import asyncio
import argparse
import json
import sys
import os

from . import MediaGenerator


def _extract_script_text(content_json_path: str) -> str:
    """Extract full script text from a content.json file."""
    with open(content_json_path, "r") as f:
        data = json.load(f)
    script = data.get("script", {})
    full_text = script.get("full_text", "")
    if full_text:
        return full_text
    segments = script.get("segments", [])
    return "。".join(s.get("text", "") for s in segments if s.get("text"))


async def _generate_voiceover(args: argparse.Namespace) -> int:
    """Generate voiceover audio."""
    text = args.text
    if args.from_content:
        text = _extract_script_text(args.from_content)
    if not text:
        print("ERROR: No text provided. Use --text or --from-content.")
        return 1

    media = MediaGenerator()
    result = await media.generate(
        "voiceover",
        text=text,
        voice_id=args.voice_id or "male-tech-01",
        speed=args.speed or 1.0,
    )
    if not result.success:
        print(f"ERROR: Voiceover generation failed: {result.error}")
        return 1

    src = result.data.audio_path
    if os.path.isfile(src):
        import shutil
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        shutil.copy2(src, args.output)
        print(f"Voiceover saved: {args.output}")
        print(f"Duration: {getattr(result.data, 'duration_seconds', '?')}s")
        return 0
    else:
        print(f"ERROR: Generated file not found: {src}")
        return 1


async def _generate_bgm(args: argparse.Namespace) -> int:
    """Generate background music."""
    prompt = args.prompt or "ambient electronic, subtle beat, modern technology"
    media = MediaGenerator()
    result = await media.generate(
        "bgm",
        prompt=prompt,
        instrumental=True,
        duration=args.duration,
    )
    if not result.success:
        print(f"ERROR: BGM generation failed: {result.error}")
        return 1

    src = result.data.audio_path
    if os.path.isfile(src):
        import shutil
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        shutil.copy2(src, args.output)
        print(f"BGM saved: {args.output}")
        print(f"Duration: {getattr(result.data, 'duration_seconds', '?')}s")
        return 0
    else:
        print(f"ERROR: Generated file not found: {src}")
        return 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Media Generation CLI for Video Pipeline")
    sub = parser.add_subparsers(dest="command", help="Sub-command")

    # voiceover
    vo = sub.add_parser("voiceover", help="Generate voiceover (TTS)")
    vo.add_argument("--text", default="", help="Text to synthesize")
    vo.add_argument("--from-content", default="", help="Path to content.json (extracts script text)")
    vo.add_argument("--voice-id", default="male-tech-01", help="Voice ID (default: male-tech-01)")
    vo.add_argument("--speed", type=float, default=1.0, help="Speech speed (0.5-2.0)")
    vo.add_argument("--output", "-o", default="voiceover.mp3", help="Output file path")

    # bgm
    bgm = sub.add_parser("bgm", help="Generate background music")
    bgm.add_argument("--prompt", default="ambient electronic, subtle beat, modern technology",
                     help="Music style description")
    bgm.add_argument("--duration", type=int, default=None, help="Target duration in seconds")
    bgm.add_argument("--output", "-o", default="bgm.mp3", help="Output file path")

    args = parser.parse_args()
    if args.command == "voiceover":
        sys.exit(asyncio.run(_generate_voiceover(args)))
    elif args.command == "bgm":
        sys.exit(asyncio.run(_generate_bgm(args)))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
