import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from ...domain.visual_blueprint.entities import Blueprint
from ...domain.visual_blueprint.interfaces import VideoRenderer

class RemotionVideoRenderer(VideoRenderer):

    async def render_video(self, blueprint: Blueprint, output_video_path: str) -> str:
        """Drives Remotion video rendering via the Python render wrapper.

        Serializes the Blueprint to JSON and invokes video-renderer/scripts/render.py
        which calls `npx remotion render` under the hood.
        """
        os.makedirs(os.path.dirname(output_video_path), exist_ok=True)

        # Write blueprint to a temp file for the renderer to consume
        temp_dir = os.path.dirname(output_video_path)
        blueprint_path = os.path.join(temp_dir, "blueprint_render.json")
        blueprint_json = blueprint.to_engine_json()
        with open(blueprint_path, "w", encoding="utf-8") as f:
            json.dump(blueprint_json, f, ensure_ascii=False, indent=2)

        # Resolve the render wrapper script
        render_script = str(Path(__file__).resolve().parent / "scripts" / "render.py")

        cmd = [
            sys.executable, render_script,
            "--blueprint", blueprint_path,
            "--output", output_video_path,
            "--composition", "VideoComposer",
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown rendering error"
            raise RuntimeError(f"Remotion rendering failed: {error_msg}")

        if not os.path.exists(output_video_path) or os.path.getsize(output_video_path) == 0:
            raise RuntimeError(f"Remotion rendering produced no output at {output_video_path}")

        return output_video_path
