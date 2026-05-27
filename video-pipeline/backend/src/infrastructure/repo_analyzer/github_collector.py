"""GitHub API-based material collector.

Uses the `gh` CLI and GitHub REST API to gather:
- Repository metadata (stars, forks, topics, language, license)
- Directory tree structure
- README content (full, not truncated)
- Core source files (up to 30, prioritized by importance)
- Asset discovery (logo, screenshots, GIFs)
- Screenshot capture via Playwright
"""

import asyncio
import base64
import json
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)

from ...infrastructure.config.app_config import settings

from ...domain.repo_analyzer.entities import (
    MaterialManifest,
    Material,
    MaterialSource,
    CaptureInfo,
    MaterialMetadata,
    RepoRef,
    RepoMetadata,
    CoreFile,
    DirectoryEntry,
)


async def _run_gh_api(repo_full_name: str, endpoint: str) -> Optional[dict]:
    """Call `gh api` asynchronously."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "gh", "api", f"/repos/{repo_full_name}/{endpoint}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
        if proc.returncode == 0:
            return json.loads(stdout.decode("utf-8", errors="replace"))
    except (asyncio.TimeoutError, FileNotFoundError, json.JSONDecodeError, OSError):
        pass
    return None


def _extract_repo_full_name(url: str) -> Optional[str]:
    """Extract 'owner/repo' from a GitHub URL."""
    patterns = [
        r"github\.com/([^/]+/[^/]+?)(?:\.git)?/?$",
        r"github\.com/([^/]+/[^/]+)",
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


# Patterns to exclude from source file collection
_EXCLUDE_PATTERNS = re.compile(
    r"(" +
    r"test|spec|__tests__|__mocks__|fixture|stub|mock|e2e|benchmark|perf|demo|example|sample|playground" +
    r"|node_modules|vendor|dist|build|out|target|\.next|\.cache|\.git" +
    r"|\.config\.|\.rc\.|webpack|vite|rollup|esbuild|babel|jest|vitest|mocha|cypress|playwright" +
    r"|Dockerfile|docker-compose|\.env|\.eslintrc|\.prettierrc|\.editorconfig|tsconfig|jest\.config" +
    r"|README|CHANGELOG|LICENSE|CONTRIBUTING|CODE_OF_CONDUCT" +
    r")",
    re.IGNORECASE,
)

# File extensions considered source code
_SOURCE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".kt",
    ".swift", ".c", ".cpp", ".h", ".hpp", ".cs", ".rb", ".php", ".scala",
    ".hs", ".clj", ".ex", ".exs", ".erl", ".zig", ".nim",
}

# Priority directories
_PRIORITY_DIRS = {"src/", "lib/", "cmd/", "pkg/", "internal/", "app/", "core/"}

_MAX_SOURCE_FILES = 30
_MAX_CHARS_PER_FILE = 4000


def _playwright_launch_args() -> list[str]:
    """Get browser launch args with proxy if configured."""
    args: list[str] = ["--no-sandbox"]
    proxy = (settings.http_proxy or settings.https_proxy)
    if proxy:
        # Port 10808 is typically SOCKS5 (Clash), Chrome needs socks5:// scheme
        proxy_arg = proxy.replace("http://", "socks5://") if "10808" in proxy else proxy
        args.append(f"--proxy-server={proxy_arg}")
        logger.info("Playwright using proxy: %s", proxy_arg)
    else:
        logger.info("Playwright running without proxy")
    return args


class GitHubMaterialCollector:
    """Collects real materials from a GitHub repository via API + Playwright."""


    async def collect(
        self,
        repo_url: str,
        output_dir: str,
        screenshot_path: str,
    ) -> tuple[str, MaterialManifest, RepoMetadata]:
        """Collect all available materials from a GitHub repo.

        Returns:
            (readme_text, material_manifest, repo_metadata)
        """
        repo_full_name = _extract_repo_full_name(repo_url)
        if not repo_full_name:
            return await self._fallback_scrape(repo_url, screenshot_path)

        os.makedirs(output_dir, exist_ok=True)
        materials: list[Material] = []

        # ── 1. Repository metadata ──
        repo_meta = await _run_gh_api(repo_full_name, "")
        metadata = RepoMetadata()
        if repo_meta:
            metadata = RepoMetadata(
                full_name=repo_meta.get("full_name", ""),
                description=repo_meta.get("description", ""),
                language=repo_meta.get("language", ""),
                stargazers_count=repo_meta.get("stargazers_count", 0),
                forks_count=repo_meta.get("forks_count", 0),
                topics=repo_meta.get("topics", []),
                license=repo_meta.get("license", {}).get("spdx_id", "") if repo_meta.get("license") else "",
                default_branch=repo_meta.get("default_branch", "main"),
                homepage=repo_meta.get("homepage", ""),
            )

        # ── 2. README content ──
        readme_text = await self._fetch_readme(repo_full_name, output_dir, materials)

        # ── 3. Directory tree ──
        dir_tree = await self._fetch_directory_tree(repo_full_name)
        metadata.directory_tree = dir_tree

        # ── 4. Core source files — SKIPPED when using CodeAgent ──
        # Claude Code reads files on its own; no need to pre-fetch.
        # If LLMRepoAnalyzer (DeepSeek) is used, uncomment the block below.
        #
        # core_files = await self._fetch_core_source_files(
        #     repo_full_name, dir_tree, output_dir, materials,
        # )
        # metadata.core_files = core_files

        # ── 5. Asset discovery ──
        await self._discover_assets(repo_full_name, output_dir, materials)

        # ── 6. Page screenshot ──
        await self._capture_screenshot(repo_url, screenshot_path, materials)

        # ── 7. Build MaterialManifest ──
        manifest = MaterialManifest(
            version="2",
            repo=RepoRef(full_name=repo_full_name, url=repo_url),
            materials=materials,
        )
        manifest.to_json_file(os.path.join(output_dir, "material_manifest.json"))

        return readme_text, manifest, metadata

    async def _fetch_readme(
        self, repo_full_name: str, output_dir: str, materials: list[Material]
    ) -> str:
        data = await _run_gh_api(repo_full_name, "readme")
        if not data:
            return ""

        content_b64 = data.get("content", "")
        encoding = data.get("encoding", "base64")
        if encoding == "base64" and content_b64:
            readme_text = base64.b64decode(content_b64).decode("utf-8", errors="replace")
        else:
            readme_text = content_b64

        readme_path = os.path.join(output_dir, "README.md")
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(readme_text)

        materials.append(Material(
            id="readme",
            type="text",
            path=readme_path,
            source=MaterialSource(type="gh_api", url=f"https://api.github.com/repos/{repo_full_name}/readme"),
            capture=CaptureInfo(method="gh_api"),
            metadata=MaterialMetadata(language="markdown"),
        ))

        return readme_text

    async def _fetch_directory_tree(self, repo_full_name: str) -> list[DirectoryEntry]:
        data = await _run_gh_api(repo_full_name, "git/trees/HEAD?recursive=1")
        if not data:
            return []

        tree = data.get("tree", [])
        return [
            DirectoryEntry(path=item.get("path", ""), type=item.get("type", ""))
            for item in tree[:500]
        ]

    def _score_source_file(self, path: str) -> int:
        path_lower = path.lower()

        if _EXCLUDE_PATTERNS.search(path_lower):
            return -1

        ext = os.path.splitext(path)[1].lower()
        if ext not in _SOURCE_EXTENSIONS:
            return -1

        score = 0

        basename = os.path.basename(path_lower)
        entry_points = {
            "index.ts", "index.tsx", "index.js", "index.jsx",
            "main.ts", "main.tsx", "main.js", "main.py",
            "app.ts", "app.tsx", "app.py", "app.go",
            "lib.ts", "lib.rs", "mod.rs",
            "cmd.py", "cli.ts", "cli.py",
            "__init__.py", "__main__.py",
            "server.ts", "server.py",
        }
        if basename in entry_points:
            score += 100

        for pdir in _PRIORITY_DIRS:
            if path.startswith(pdir):
                score += 30
                break

        depth = path.count("/")
        if depth <= 1:
            score += 20
        elif depth <= 3:
            score += 10

        if ext in (".py", ".ts", ".tsx", ".go"):
            score += 5

        return score

    async def _fetch_core_source_files(
        self,
        repo_full_name: str,
        dir_tree: list[DirectoryEntry],
        output_dir: str,
        materials: list[Material],
    ) -> list[CoreFile]:
        scored_files: list[tuple[int, str]] = []
        for item in dir_tree:
            if item.type != "blob":
                continue
            score = self._score_source_file(item.path)
            if score > 0:
                scored_files.append((score, item.path))

        scored_files.sort(key=lambda x: -x[0])
        candidates = [path for _, path in scored_files[:_MAX_SOURCE_FILES]]

        sources_dir = os.path.join(output_dir, "sources")
        os.makedirs(sources_dir, exist_ok=True)

        collected: list[CoreFile] = []
        for rel_path in candidates:
            data = await _run_gh_api(repo_full_name, f"contents/{rel_path}")
            if not data or data.get("type") != "file":
                continue

            content_b64 = data.get("content", "")
            if not content_b64:
                continue

            try:
                content = base64.b64decode(content_b64).decode("utf-8", errors="replace")
            except Exception:
                continue

            truncated = content[:_MAX_CHARS_PER_FILE]

            safe_name = rel_path.replace("/", "_")
            file_path = os.path.join(sources_dir, safe_name)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(truncated)

            materials.append(Material(
                id=f"source_{safe_name.replace('.', '_')}",
                type="code",
                path=file_path,
                source=MaterialSource(
                    type="gh_api",
                    url=f"https://github.com/{repo_full_name}/blob/HEAD/{rel_path}",
                ),
                capture=CaptureInfo(method="gh_api"),
                metadata=MaterialMetadata(language=self._detect_language(rel_path)),
            ))

            collected.append(CoreFile(path=rel_path, content=truncated))

        logger.info("Collected %d core source files", len(collected))
        return collected

    async def _discover_assets(
        self, repo_full_name: str, output_dir: str, materials: list[Material]
    ) -> None:
        candidates = []
        readme_path = os.path.join(output_dir, "README.md")
        readme_images: dict[str, dict[str, str]] = {}
        if os.path.exists(readme_path):
            with open(readme_path, "r", encoding="utf-8") as f:
                readme_text = f.read()

            lines = readme_text.splitlines()
            for i, line in enumerate(lines):
                for match in re.finditer(r'!\[(.*?)\]\(([^)]+)\)', line):
                    alt_text = match.group(1)
                    url = match.group(2)
                    if url.startswith("http") or url.startswith("data:"):
                        continue
                    start_idx = max(0, i - 3)
                    end_idx = min(len(lines), i + 3)
                    readme_images[url] = {"alt": alt_text, "context": "\n".join(lines[start_idx:end_idx])}

                for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', line):
                    url = match.group(1)
                    if url.startswith("http") or url.startswith("data:"):
                        continue
                    alt_match = re.search(r'alt=["\']([^"\']*)["\']', match.group(0))
                    alt_text = alt_match.group(1) if alt_match else ""
                    start_idx = max(0, i - 3)
                    end_idx = min(len(lines), i + 3)
                    readme_images[url] = {"alt": alt_text, "context": "\n".join(lines[start_idx:end_idx])}

        asset_paths = [
            "logo.png", "logo.svg", "logo.jpg",
            "docs/logo.png", "docs/logo.svg",
            "assets/logo.png", "assets/logo.svg",
            "img/logo.png", "images/logo.png",
        ]
        all_targets = list(dict.fromkeys(asset_paths + list(readme_images.keys())))

        for rel_path in all_targets[:30]:
            data = await _run_gh_api(repo_full_name, f"contents/{rel_path}")
            if not data or data.get("type") != "file":
                continue

            download_url = data.get("download_url")
            if not download_url:
                continue

            img_info = readme_images.get(rel_path, {"alt": "Project Asset", "context": ""})
            candidates.append({
                "path": rel_path,
                "download_url": download_url,
                "alt": img_info["alt"],
                "context": img_info["context"],
            })

        candidate_path = os.path.join(output_dir, "candidate_materials.json")
        with open(candidate_path, "w", encoding="utf-8") as f:
            json.dump(candidates, f, indent=2, ensure_ascii=False)

    async def _capture_screenshot(
        self, repo_url: str, screenshot_path: str, materials: list[Material]
    ) -> None:
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True, args=_playwright_launch_args())
                page = await browser.new_page(viewport={"width": 1920, "height": 1080})
                await page.goto(repo_url, wait_until="domcontentloaded", timeout=30000)
                # Don't use "networkidle" — GitHub has persistent WebSocket connections
                # (notifications, real-time updates) that prevent it from ever firing.
                await asyncio.sleep(2)  # give JS time to render
                await page.screenshot(path=screenshot_path, full_page=True)
                await browser.close()

            materials.append(Material(
                id="page_screenshot",
                type="image",
                path=screenshot_path,
                source=MaterialSource(type="playwright", url=repo_url),
                capture=CaptureInfo(method="playwright"),
                metadata=MaterialMetadata(alt_text=f"Full-page screenshot of {repo_url}"),
            ))
        except Exception as e:
            logger.warning("Screenshot capture failed: %s", e)

    async def _fallback_scrape(
        self, repo_url: str, screenshot_path: str
    ) -> tuple[str, MaterialManifest, RepoMetadata]:
        readme_text = ""
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True, args=_playwright_launch_args())
                page = await browser.new_page()
                await page.goto(repo_url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(2)
                readme_el = await page.query_selector("article")
                if readme_el:
                    readme_text = await readme_el.inner_text()
                await page.screenshot(path=screenshot_path, full_page=True)
                await browser.close()
        except Exception as e:
            logger.warning("Fallback scrape failed: %s", e)

        manifest = MaterialManifest(
            materials=[
                Material(
                    id="page_screenshot",
                    type="image",
                    path=screenshot_path,
                    source=MaterialSource(type="playwright", url=repo_url),
                    capture=CaptureInfo(method="playwright"),
                )
            ]
        )
        return readme_text, manifest, RepoMetadata()

    @staticmethod
    def _detect_language(filename: str) -> str:
        lang_map = {
            ".json": "json", ".toml": "toml", ".py": "python", ".txt": "text",
            ".mod": "go", ".cfg": "ini", ".ts": "typescript", ".tsx": "typescript",
            ".js": "javascript", ".jsx": "javascript", ".go": "go", ".rs": "rust",
        }
        ext = os.path.splitext(filename)[1].lower()
        return lang_map.get(ext, "")
