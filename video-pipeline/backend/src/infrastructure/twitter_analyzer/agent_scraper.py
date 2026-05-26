"""Agent Scraper for Twitter — yt-dlp primary + Playwright fallback.

Uses shared media_downloader (fetch_metadata + download_media) for text,
images, and videos. Falls back to Playwright screenshot on failure.
"""

import asyncio
import logging
import os
import re

from ...infrastructure.config.app_config import settings
from ...infrastructure.media_generator.media_downloader import download_media, fetch_metadata
from ...domain.twitter_analyzer.entities import RawScrapeResult

logger = logging.getLogger(__name__)


class OpenCLITwitterScraper:
    """Twitter scraper — yt-dlp primary, Playwright screenshot fallback."""

    def __init__(self, timeout: int = 120) -> None:
        self.timeout = timeout

    async def scrape(self, url: str, output_dir: str) -> RawScrapeResult:
        logger.info("[TwitterScraper] Scraping: %s", url)
        os.makedirs(output_dir, exist_ok=True)

        # ── Step 1: yt-dlp (primary — gets text + downloads media) ──
        result = await self._try_ytdlp(url, output_dir)
        if result is not None and (result.main_tweet_text or result.media_urls):
            self._save_result(result, output_dir)
            return result

        # ── Step 2: Playwright screenshot only ──
        logger.info("[TwitterScraper] yt-dlp failed, Playwright screenshot only...")
        screenshot_paths = await self._capture_screenshot(url, output_dir)
        fallback = RawScrapeResult(screenshot_paths=screenshot_paths, error="All methods failed")
        self._save_result(fallback, output_dir)
        return fallback

    # ── yt-dlp (shared media_downloader) ──

    async def _try_ytdlp(self, url: str, output_dir: str) -> RawScrapeResult | None:
        try:
            info = await fetch_metadata(url)
            if info is None:
                return None

            media_dir = os.path.join(output_dir, "media")
            media_files = await download_media(url, media_dir)

            main_text = info.get("description") or info.get("title", "")
            main_text = re.sub(r"\s+", " ", main_text).strip()

            return RawScrapeResult(
                main_tweet_text=main_text[:5000],
                author_handle=info.get("uploader_id", ""),
                author_name=info.get("uploader", ""),
                media_urls=media_files,
                screenshot_paths=[],
            )
        except FileNotFoundError:
            logger.warning("[TwitterScraper] yt-dlp not found")
            return None
        except Exception as e:
            logger.warning("[TwitterScraper] yt-dlp error: %s", e)
            return None

    # ── Playwright ──

    def _launch_args(self) -> list[str]:
        proxy = settings.http_proxy
        args = ["--no-sandbox"]
        if proxy:
            proxy_arg = proxy.replace("http://", "socks5://") if "10808" in proxy else proxy
            args.append(f"--proxy-server={proxy_arg}")
        return args

    async def _capture_screenshot(self, url: str, output_dir: str) -> list[str]:
        try:
            from playwright.async_api import async_playwright

            path = os.path.join(output_dir, "tweet_screenshot.png")
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True, args=self._launch_args())
                page = await browser.new_page(viewport={"width": 1920, "height": 1080})
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(3000)
                await page.screenshot(path=path, full_page=True)
                await browser.close()
            return [path]
        except Exception as e:
            logger.warning("[TwitterScraper] Screenshot failed: %s", e)
            return []

    @staticmethod
    def _save_result(result: RawScrapeResult, output_dir: str) -> None:
        try:
            path = os.path.join(output_dir, "raw_scrape_result.json")
            with open(path, "w", encoding="utf-8") as f:
                f.write(result.model_dump_json(indent=2))
        except Exception as e:
            logger.warning("[TwitterScraper] Save failed: %s", e)
