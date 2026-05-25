"""GitHub API-based material collector.

Uses the `gh` CLI and GitHub REST API to gather:
- Repository metadata (stars, forks, topics, language, license)
- Directory tree structure
- README content (full, not truncated)
- Key file contents (pyproject.toml, package.json, go.mod, Cargo.toml, main entry)
- Asset discovery (logo, screenshots, GIFs)
- Screenshot capture via Playwright

All collected materials are saved to the output directory and a MaterialManifest is produced.
"""

import asyncio
import base64
import json
import os
import re
import subprocess
from typing import Optional

from ...domain.analyzer.entities import (
    MaterialManifest,
    Material,
    MaterialSource,
    CaptureInfo,
    MaterialMetadata,
    RepoRef,
)


def _run_gh_api(repo_full_name: str, endpoint: str) -> Optional[dict]:
    """Call `gh api` for a GitHub REST API endpoint."""
    try:
        result = subprocess.run(
            ["gh", "api", f"/repos/{repo_full_name}/{endpoint}"],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
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


class GitHubMaterialCollector:
    """Collects real materials from a GitHub repository via API + Playwright.

    This replaces the old PlaywrightScraper which only grabbed README text.
    """

    async def collect(
        self,
        repo_url: str,
        output_dir: str,
        screenshot_path: str,
    ) -> tuple[str, MaterialManifest, dict, dict]:
        """Collect all available materials from a GitHub repo.

        Returns:
            (readme_text, material_manifest, repo_metadata, dependency_summary)
        """
        repo_full_name = _extract_repo_full_name(repo_url)
        if not repo_full_name:
            # Fallback: use Playwright for non-GitHub URLs
            return await self._fallback_scrape(repo_url, screenshot_path)

        os.makedirs(output_dir, exist_ok=True)
        materials: list[Material] = []

        # ── 1. Repository metadata ──
        repo_meta = _run_gh_api(repo_full_name, "")
        repo_metadata = {}
        if repo_meta:
            repo_metadata = {
                "full_name": repo_meta.get("full_name", ""),
                "description": repo_meta.get("description", ""),
                "language": repo_meta.get("language", ""),
                "stargazers_count": repo_meta.get("stargazers_count", 0),
                "forks_count": repo_meta.get("forks_count", 0),
                "topics": repo_meta.get("topics", []),
                "license": repo_meta.get("license", {}).get("spdx_id", "") if repo_meta.get("license") else "",
                "default_branch": repo_meta.get("default_branch", "main"),
                "homepage": repo_meta.get("homepage", ""),
            }

        # ── 2. README content (full, not truncated) ──
        readme_text = await self._fetch_readme(repo_full_name, output_dir, materials)

        # ── 3. Directory tree ──
        dir_tree = await self._fetch_directory_tree(repo_full_name)

        # ── 4. Key configuration files ──
        await self._fetch_config_files(repo_full_name, output_dir, materials)

        # ── 5. Core source files ──
        core_files = await self._fetch_core_source_files(
            repo_full_name, dir_tree, output_dir, materials,
        )

        # ── 6. Dependency summary (parses config files collected in step 4) ──
        dependency_summary = await self._fetch_dependency_summary(output_dir)

        # ── 7. Asset discovery (images, GIFs) ──
        await self._discover_assets(repo_full_name, output_dir, materials)

        # ── 8. Page screenshot ──
        await self._capture_screenshot(repo_url, screenshot_path, materials)

        # ── 9. Build MaterialManifest ──
        manifest = MaterialManifest(
            version="2",
            repo=RepoRef(
                full_name=repo_full_name,
                url=repo_url,
            ),
            materials=materials,
        )

        # Save manifest
        manifest.to_json_file(os.path.join(output_dir, "material_manifest.json"))

        # Attach dir_tree and core_files to metadata for downstream consumption
        repo_metadata["directory_tree"] = dir_tree
        repo_metadata["core_files"] = core_files

        return readme_text, manifest, repo_metadata, dependency_summary

    async def _fetch_readme(
        self, repo_full_name: str, output_dir: str, materials: list[Material]
    ) -> str:
        """Fetch README content via GitHub API."""
        data = _run_gh_api(repo_full_name, "readme")
        if not data:
            return ""

        content_b64 = data.get("content", "")
        encoding = data.get("encoding", "base64")
        if encoding == "base64" and content_b64:
            readme_text = base64.b64decode(content_b64).decode("utf-8", errors="replace")
        else:
            readme_text = content_b64

        # Save README to output dir
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

    async def _fetch_directory_tree(self, repo_full_name: str) -> list[dict]:
        """Fetch the repository directory tree."""
        data = _run_gh_api(repo_full_name, "git/trees/HEAD?recursive=1")
        if not data:
            return []

        tree = data.get("tree", [])
        # Return a simplified version (path + type)
        return [
            {"path": item.get("path", ""), "type": item.get("type", "")}
            for item in tree[:500]  # Limit to 500 entries
        ]

    async def _fetch_config_files(
        self, repo_full_name: str, output_dir: str, materials: list[Material]
    ) -> None:
        """Fetch key configuration/entry files."""
        config_targets = [
            "package.json", "pyproject.toml", "Cargo.toml", "go.mod",
            "setup.py", "requirements.txt", "Gemfile",
        ]
        configs_dir = os.path.join(output_dir, "configs")
        os.makedirs(configs_dir, exist_ok=True)

        for target in config_targets:
            data = _run_gh_api(repo_full_name, f"contents/{target}")
            if not data or data.get("type") != "file":
                continue

            content_b64 = data.get("content", "")
            if not content_b64:
                continue

            try:
                content = base64.b64decode(content_b64).decode("utf-8", errors="replace")
            except Exception:
                continue

            file_path = os.path.join(configs_dir, target)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)

            materials.append(Material(
                id=f"config_{target.replace('.', '_')}",
                type="code",
                path=file_path,
                source=MaterialSource(type="gh_api", url=f"https://github.com/{repo_full_name}/blob/HEAD/{target}"),
                capture=CaptureInfo(method="gh_api"),
                metadata=MaterialMetadata(language=self._detect_language(target)),
            ))

    async def _discover_assets(
        self, repo_full_name: str, output_dir: str, materials: list[Material]
    ) -> None:
        """Discover and download image/GIF assets from the repo."""
        assets_dir = os.path.join(output_dir, "assets")
        os.makedirs(assets_dir, exist_ok=True)

        # Common asset locations
        asset_paths = [
            "logo.png", "logo.svg", "logo.jpg",
            "docs/logo.png", "docs/logo.svg",
            "assets/logo.png", "assets/logo.svg",
            "img/logo.png", "images/logo.png",
        ]

        # Also search README for image references
        readme_path = os.path.join(output_dir, "README.md")
        readme_images: list[str] = []
        if os.path.exists(readme_path):
            with open(readme_path, "r", encoding="utf-8") as f:
                readme_text = f.read()
            # Find ![alt](path) and <img src="path"> patterns
            readme_images = re.findall(r'!\[.*?\]\(([^)]+)\)', readme_text)
            readme_images += re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', readme_text)
            # Filter to relative paths (not URLs)
            readme_images = [p for p in readme_images if not p.startswith("http") and not p.startswith("data:")]

        # Deduplicate
        all_targets = list(dict.fromkeys(asset_paths + readme_images))

        for rel_path in all_targets[:20]:  # Limit to 20 assets
            data = _run_gh_api(repo_full_name, f"contents/{rel_path}")
            if not data or data.get("type") != "file":
                continue

            # For binary files, use the download_url
            download_url = data.get("download_url")
            if not download_url:
                continue

            filename = os.path.basename(rel_path)
            file_path = os.path.join(assets_dir, filename)

            # Download the file
            try:
                result = subprocess.run(
                    ["gh", "api", download_url.replace("https://api.github.com", "")],
                    capture_output=True, timeout=30,
                )
                if result.returncode == 0 and len(result.stdout) > 0:
                    with open(file_path, "wb") as f:
                        f.write(result.stdout)

                    # Determine if image or other
                    ext = os.path.splitext(filename)[1].lower()
                    mat_type = "image" if ext in (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp") else "other"

                    materials.append(Material(
                        id=f"asset_{filename.replace('.', '_')}",
                        type=mat_type,
                        path=file_path,
                        source=MaterialSource(type="gh_api", original_url=rel_path),
                        capture=CaptureInfo(method="gh_api"),
                    ))
            except (subprocess.TimeoutExpired, FileNotFoundError):
                pass

    async def _capture_screenshot(
        self, repo_url: str, screenshot_path: str, materials: list[Material]
    ) -> None:
        """Capture a full-page screenshot of the GitHub repo page."""
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page(viewport={"width": 1920, "height": 1080})
                await page.goto(repo_url, wait_until="networkidle", timeout=30000)
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
            print(f"[GitHubCollector] Screenshot capture failed: {e}")

    async def _fallback_scrape(
        self, repo_url: str, screenshot_path: str
    ) -> tuple[str, MaterialManifest, dict, dict]:
        """Fallback for non-GitHub URLs: Playwright-only scraping."""
        readme_text = ""
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto(repo_url)
                readme_el = await page.query_selector("article")
                if readme_el:
                    readme_text = await readme_el.inner_text()
                await page.screenshot(path=screenshot_path, full_page=True)
                await browser.close()
        except Exception as e:
            print(f"[GitHubCollector] Fallback scrape failed: {e}")

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
        return readme_text, manifest, {}, {}

    # ── Core source file patterns (ordered by priority) ──
    _CORE_FILE_PATTERNS: list[str] = [
        "src/index.ts", "src/index.tsx", "src/index.js", "src/index.jsx",
        "src/main.ts", "src/main.tsx", "src/main.js", "src/main.py",
        "src/app.ts", "src/app.tsx", "src/app.py",
        "src/lib.ts", "src/lib.rs",
        "lib/index.ts", "lib/index.js",
        "cmd/main.go", "main.go",
        "app.py", "manage.py", "wsgi.py", "asgi.py",
        "index.ts", "index.js",
    ]

    async def _fetch_core_source_files(
        self,
        repo_full_name: str,
        dir_tree: list[dict],
        output_dir: str,
        materials: list[Material],
    ) -> list[dict[str, str]]:
        """Read up to 5 core source files identified from the directory tree.

        Returns a list of dicts with keys 'path' and 'content' (truncated to
        2000 chars each for LLM context budget).
        """
        # Build a set of all file paths in the tree for fast lookup
        tree_paths = {item["path"] for item in dir_tree if item.get("type") == "blob"}

        # Find which of our candidate patterns actually exist in the repo
        candidates = [p for p in self._CORE_FILE_PATTERNS if p in tree_paths]

        # If none matched, try a fuzzy search for common entry points
        if not candidates:
            fuzzy_patterns = [
                r"src/index\..+", r"src/main\..+", r"src/app\..+",
                r"lib/index\..+", r"cmd/main\.go", r"main\.go",
                r"app\.py", r"manage\.py", r"index\.ts", r"index\.js",
            ]
            for item in dir_tree:
                path = item.get("path", "")
                if item.get("type") != "blob":
                    continue
                for pat in fuzzy_patterns:
                    if re.match(pat, path):
                        candidates.append(path)
                        break
                if len(candidates) >= 5:
                    break

        # Limit to 5 files
        candidates = candidates[:5]

        sources_dir = os.path.join(output_dir, "sources")
        os.makedirs(sources_dir, exist_ok=True)

        collected: list[dict[str, str]] = []
        for rel_path in candidates:
            data = _run_gh_api(repo_full_name, f"contents/{rel_path}")
            if not data or data.get("type") != "file":
                continue

            content_b64 = data.get("content", "")
            if not content_b64:
                continue

            try:
                content = base64.b64decode(content_b64).decode("utf-8", errors="replace")
            except Exception:
                continue

            # Truncate to 2000 chars for LLM context budget
            truncated = content[:2000]

            # Save to sources directory
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
                metadata=MaterialMetadata(
                    language=self._detect_language(rel_path),
                ),
            ))

            collected.append({"path": rel_path, "content": truncated})

        return collected

    async def _fetch_dependency_summary(self, output_dir: str) -> dict:
        """Parse dependency files already collected in output_dir/configs/.

        Returns a dict like:
            {"language": "Python", "frameworks": ["FastAPI"], "key_deps": ["langchain", "pydantic"]}
        """
        configs_dir = os.path.join(output_dir, "configs")
        summary: dict[str, list[str]] = {"frameworks": [], "key_deps": []}
        language = ""
        frameworks: list[str] = []
        key_deps: list[str] = []

        # ── package.json ──
        pkg_path = os.path.join(configs_dir, "package.json")
        if os.path.exists(pkg_path):
            language = language or "JavaScript/TypeScript"
            try:
                with open(pkg_path, "r", encoding="utf-8") as f:
                    pkg = json.load(f)
                all_deps = list(pkg.get("dependencies", {}).keys()) + list(
                    pkg.get("devDependencies", {}).keys()
                )
                # Classify frameworks vs regular deps
                framework_names = {
                    "react", "vue", "next", "nuxt", "svelte", "express",
                    "fastify", "nestjs", "@nestjs/core", "angular", "@angular/core",
                    "remotion", "@remotion/cli",
                }
                for dep in all_deps:
                    dep_lower = dep.lower()
                    if any(fw in dep_lower for fw in framework_names):
                        frameworks.append(dep)
                    else:
                        key_deps.append(dep)
            except (json.JSONDecodeError, OSError):
                pass

        # ── pyproject.toml ──
        pyproject_path = os.path.join(configs_dir, "pyproject.toml")
        if os.path.exists(pyproject_path):
            language = language or "Python"
            try:
                with open(pyproject_path, "r", encoding="utf-8") as f:
                    content = f.read()
                # Simple TOML parsing for dependencies section
                in_deps = False
                for line in content.splitlines():
                    stripped = line.strip()
                    if stripped.startswith("[project]") or stripped.startswith("[tool.poetry]"):
                        in_deps = False
                    if stripped.startswith("dependencies") and "=" in stripped:
                        in_deps = True
                        # Inline format: dependencies = ["foo", "bar"]
                        if "[" in stripped:
                            deps_str = stripped[stripped.index("[") + 1 : stripped.rindex("]")]
                            for dep in deps_str.split(","):
                                dep = dep.strip().strip("\"'")
                                if dep:
                                    self._classify_python_dep(dep, frameworks, key_deps)
                        continue
                    if in_deps:
                        if stripped.startswith("["):
                            in_deps = False
                            continue
                        # Poetry format: dep = "^1.0" or dep = {version = "^1.0", ...}
                        match = re.match(r'^([a-zA-Z0-9_-]+)\s*=', stripped)
                        if match:
                            dep_name = match.group(1)
                            if dep_name.lower() not in ("python", "version", "optional"):
                                self._classify_python_dep(dep_name, frameworks, key_deps)
            except OSError:
                pass

        # ── requirements.txt ──
        req_path = os.path.join(configs_dir, "requirements.txt")
        if os.path.exists(req_path):
            language = language or "Python"
            try:
                with open(req_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and not line.startswith("-"):
                            dep_name = re.split(r'[><=!~\[]', line)[0].strip()
                            if dep_name:
                                self._classify_python_dep(dep_name, frameworks, key_deps)
            except OSError:
                pass

        # ── go.mod ──
        gomod_path = os.path.join(configs_dir, "go.mod")
        if os.path.exists(gomod_path):
            language = language or "Go"
            try:
                with open(gomod_path, "r", encoding="utf-8") as f:
                    content = f.read()
                in_require = False
                for line in content.splitlines():
                    stripped = line.strip()
                    if stripped == "require (":
                        in_require = True
                        continue
                    if in_require:
                        if stripped == ")":
                            in_require = False
                            continue
                        parts = stripped.split()
                        if parts:
                            dep = parts[0]
                            go_frameworks = {
                                "github.com/gin-gonic/gin",
                                "github.com/gofiber/fiber",
                                "github.com/labstack/echo",
                                "github.com/go-chi/chi",
                                "github.com/gorilla/mux",
                            }
                            if any(fw in dep for fw in go_frameworks):
                                frameworks.append(dep)
                            else:
                                key_deps.append(dep)
                    elif stripped.startswith("require "):
                        # Single-line require
                        parts = stripped[len("require "):].split()
                        if parts:
                            key_deps.append(parts[0])
            except OSError:
                pass

        # ── Cargo.toml ──
        cargo_path = os.path.join(configs_dir, "Cargo.toml")
        if os.path.exists(cargo_path):
            language = language or "Rust"
            try:
                with open(cargo_path, "r", encoding="utf-8") as f:
                    content = f.read()
                in_deps = False
                for line in content.splitlines():
                    stripped = line.strip()
                    if stripped == "[dependencies]":
                        in_deps = True
                        continue
                    if stripped.startswith("["):
                        in_deps = False
                        continue
                    if in_deps:
                        match = re.match(r'^([a-zA-Z0-9_-]+)\s*=', stripped)
                        if match:
                            dep_name = match.group(1)
                            rust_frameworks = {"tokio", "actix-web", "axum", "warp", "rocket"}
                            if dep_name.lower() in rust_frameworks:
                                frameworks.append(dep_name)
                            else:
                                key_deps.append(dep_name)
            except OSError:
                pass

        return {
            "language": language,
            "frameworks": list(dict.fromkeys(frameworks)),
            "key_deps": list(dict.fromkeys(key_deps))[:30],
        }

    @staticmethod
    def _classify_python_dep(
        dep_name: str, frameworks: list[str], key_deps: list[str]
    ) -> None:
        """Classify a Python dependency as framework or regular dep."""
        python_frameworks = {
            "fastapi", "flask", "django", "starlette", "sanic",
            "tornado", "aiohttp", "celery", "langchain", "langchain-core",
            "pydantic", "sqlalchemy", "scrapy", "requests", "httpx",
        }
        if dep_name.lower() in python_frameworks:
            frameworks.append(dep_name)
        else:
            key_deps.append(dep_name)

    @staticmethod
    def _detect_language(filename: str) -> str:
        lang_map = {
            ".json": "json",
            ".toml": "toml",
            ".py": "python",
            ".txt": "text",
            ".mod": "go",
            ".cfg": "ini",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".js": "javascript",
            ".jsx": "javascript",
            ".go": "go",
            ".rs": "rust",
        }
        ext = os.path.splitext(filename)[1].lower()
        return lang_map.get(ext, "")
