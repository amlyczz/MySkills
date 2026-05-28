import asyncio
import logging
import os
import subprocess

from ...domain.repo_analyzer.interfaces import MaterialDownloader
from ...domain.repo_analyzer.entities import MaterialManifest, Material, MaterialSource, CaptureInfo

logger = logging.getLogger(__name__)

class BashMaterialDownloader(MaterialDownloader):
    """Downloads materials using curl or gh CLI."""

    async def download(
        self, urls: list[str], output_dir: str, manifest: MaterialManifest
    ) -> None:
        assets_dir = os.path.join(output_dir, "assets")
        os.makedirs(assets_dir, exist_ok=True)

        for url in urls:
            filename = os.path.basename(url.split("?")[0])
            if not filename:
                continue
            file_path = os.path.join(assets_dir, filename)

            try:
                if "api.github.com" in url:
                    cmd = ["gh", "api", url.replace("https://api.github.com", "")]
                else:
                    cmd = ["curl", "-sL", url]

                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                
                try:
                    stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30.0)
                except asyncio.TimeoutError:
                    process.kill()
                    await process.communicate()
                    raise TimeoutError(f"Command timed out after 30s: {' '.join(cmd)}")

                if process.returncode == 0 and len(stdout) > 0:
                    with open(file_path, "wb") as f:
                        f.write(stdout)

                    ext = os.path.splitext(filename)[1].lower()
                    mat_type = "image" if ext in (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp") else "other"
                    manifest.materials.append(Material(
                        id=f"asset_curated_{filename.replace('.', '_')}",
                        type=mat_type,
                        path=file_path,
                        source=MaterialSource(type="curated_download", url=url),
                        capture=CaptureInfo(method="lazy_fetch")
                    ))
            except Exception as e:
                logger.warning(f"[BashMaterialDownloader] Failed to lazy fetch {url}: {e}")
