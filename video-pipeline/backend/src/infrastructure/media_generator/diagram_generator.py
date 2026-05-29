"""Renders Mermaid diagrams found in ScriptSegment.assigned_asset to SVG/PNG files."""

import asyncio
import logging
import shutil
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

# Patterns that indicate Mermaid code (not a file path)
MERMAID_STARTS = (
    "graph ", "flowchart ", "sequenceDiagram", "stateDiagram",
    "classDiagram", "erDiagram", "gantt", "pie", "gitGraph",
    "journey", "mindmap", "timeline",
)

from ...domain.media_generator.interfaces import DiagramGenerator as IDiagramGenerator


class DiagramGenerator(IDiagramGenerator):
    """Detects Mermaid code in script segments and renders to SVG files via local mmdc CLI."""

    def __init__(self) -> None:
        self._mmdc = shutil.which("mmdc")
        if not self._mmdc:
            logger.warning("mmdc not found in PATH; diagram rendering will be skipped")

    async def generate(self, script, output_dir: str) -> list[str]:
        """Walk script.segments, render Mermaid in assigned_asset to SVG via local mmdc."""
        if not self._mmdc:
            logger.warning("mmdc not available, skipping diagram generation")
            return []

        generated: list[str] = []
        out_dir = Path(output_dir)
        diagrams_dir = out_dir / "diagrams"

        for i, seg in enumerate(script.segments):
            asset = seg.assigned_asset
            if not asset or not self._is_mermaid(asset):
                continue

            svg_path = diagrams_dir / f"seg_{i:03d}.svg"
            try:
                svg_content = await self._render_mermaid(asset)
                diagrams_dir.mkdir(parents=True, exist_ok=True)
                svg_path.write_text(svg_content, encoding="utf-8")
                seg.assigned_asset = str(svg_path)
                generated.append(str(svg_path))
                logger.info("Rendered diagram for segment %d → %s", i, svg_path)
            except Exception as e:
                logger.warning("Failed to render diagram for segment %d: %s", i, e)

        return generated

    @staticmethod
    def _is_mermaid(text: str) -> bool:
        """Check if text looks like Mermaid code rather than a file path/URL."""
        stripped = text.strip()
        # File paths and URLs are not Mermaid
        if stripped.startswith(("/", "http://", "https://", ".")):
            return False
        return any(stripped.startswith(prefix) for prefix in MERMAID_STARTS)

    async def _render_mermaid(self, mermaid_code: str) -> str:
        """Render Mermaid code to SVG via local mmdc CLI."""
        with tempfile.TemporaryDirectory() as tmp:
            mmd_path = Path(tmp) / "input.mmd"
            svg_path = Path(tmp) / "output.svg"
            mmd_path.write_text(mermaid_code.strip(), encoding="utf-8")

            proc = await asyncio.create_subprocess_exec(
                self._mmdc,
                "-i", str(mmd_path),
                "-o", str(svg_path),
                "--quiet",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)

            if proc.returncode != 0:
                raise RuntimeError(f"mmdc exited {proc.returncode}: {stderr.decode().strip()}")

            return svg_path.read_text(encoding="utf-8")
