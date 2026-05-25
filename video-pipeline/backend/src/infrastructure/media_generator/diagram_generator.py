"""Renders Mermaid diagrams found in ScriptSegment.assigned_asset to SVG/PNG files."""

import asyncio
import logging
import re
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

# Patterns that indicate Mermaid code (not a file path)
MERMAID_STARTS = (
    "graph ", "flowchart ", "sequenceDiagram", "stateDiagram",
    "classDiagram", "erDiagram", "gantt", "pie", "gitGraph",
    "journey", "mindmap", "timeline",
)

KROKI_URL = "https://kroki.io"


class DiagramGenerator:
    """Detects Mermaid code in script segments and renders to SVG files."""

    def __init__(self, output_dir: str | Path, kroki_url: str = KROKI_URL) -> None:
        self.output_dir = Path(output_dir)
        self.kroki_url = kroki_url.rstrip("/")
        self._diagrams_dir = self.output_dir / "diagrams"

    async def generate(self, script) -> list[str]:
        """Walk script.segments, render Mermaid in assigned_asset to SVG.

        Args:
            script: Script object with .segments list of ScriptSegment.

        Returns:
            List of generated file paths.
        """
        generated: list[str] = []

        for i, seg in enumerate(script.segments):
            asset = seg.assigned_asset
            if not asset or not self._is_mermaid(asset):
                continue

            svg_path = self._diagrams_dir / f"seg_{i:03d}.svg"
            try:
                svg_content = await self._render_mermaid(asset)
                self._diagrams_dir.mkdir(parents=True, exist_ok=True)
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
        """Render Mermaid code to SVG via Kroki API.

        Kroki accepts POST /mermaid/svg with plain-text Mermaid body
        and returns SVG content.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.kroki_url}/mermaid/svg",
                content=mermaid_code.strip(),
                headers={"Content-Type": "text/plain"},
            )
            resp.raise_for_status()
            return resp.text
