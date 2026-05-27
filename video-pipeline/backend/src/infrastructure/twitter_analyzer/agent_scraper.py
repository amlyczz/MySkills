"""Agent Scraper for Twitter — fxtwitter API primary + yt-dlp + Playwright fallback.

fxtwitter API (https://api.fxtwitter.com/status/<id>) returns full JSON including
text, author, stats, video URLs, and quoted tweets — no auth/cookie required.
"""

import asyncio
import json
import logging
import os
import re
from urllib.parse import urlparse

import httpx

from ...infrastructure.config.app_config import settings
from ...infrastructure.media_generator.media_downloader import download_media, fetch_metadata
from ...domain.twitter_analyzer.entities import RawScrapeResult

logger = logging.getLogger(__name__)


def _extract_tweet_id(url: str) -> str | None:
    """Extract tweet ID from twitter.com or x.com URL."""
    patterns = [
        r"(?:twitter\.com|x\.com)/\w+/status/(\d+)",
        r"status/(\d+)",
    ]
    for pattern in patterns:
        m = re.search(pattern, url)
        if m:
            return m.group(1)
    return None


class FxTwitterScraper:
    """Twitter scraper via fxtwitter API — no auth required."""

    def __init__(self, timeout: int = 30) -> None:
        self.timeout = timeout

    async def scrape(self, url: str, output_dir: str) -> RawScrapeResult:
        logger.info("[FxTwitterScraper] Fetching: %s", url)
        os.makedirs(output_dir, exist_ok=True)

        tweet_id = _extract_tweet_id(url)
        if not tweet_id:
            logger.warning("[FxTwitterScraper] Could not extract tweet ID from: %s", url)
            return RawScrapeResult(error=f"Could not extract tweet ID from {url}")

        api_url = f"https://api.fxtwitter.com/status/{tweet_id}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                resp = await client.get(api_url)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning("[FxTwitterScraper] HTTP error: %s", e)
            return RawScrapeResult(error=f"fxtwitter API error: {e.response.status_code}")
        except Exception as e:
            logger.warning("[FxTwitterScraper] Request failed: %s", e)
            return RawScrapeResult(error=f"fxtwitter request failed: {e}")

        # Parse fxtwitter response structure
        result = data.get("result", data)
        tweet = result.get("tweet", result)

        # Post-process to handle nested structures from different API versions
        if isinstance(tweet, dict):
            # Normalize: older versions have `post` at root, newer have `tweet`
            raw_text = (
                tweet.get("text")
                or tweet.get("full_text")
                or tweet.get("content", "")
            )
            # Author info
            author = tweet.get("author", {})
            user = tweet.get("user", author)
            author_handle = user.get("screen_name", "") or user.get("username", "")
            author_name = user.get("name", "") or user.get("displayname", "")

            # Stats
            stats = tweet.get("stats", {})
            engagement = tweet.get("engagement", stats)
            views = int(engagement.get("views", engagement.get("impressions", 0)) or 0)
            likes = int(engagement.get("likes", 0) or 0)
            reposts = int(engagement.get("retweets", engagement.get("reposts", 0)) or 0)
            bookmarks = int(engagement.get("bookmarks", 0) or 0)

            # Media: videos, images, animated_gif
            media_urls: list[str] = []
            media = tweet.get("media", []) or []
            for m in media:
                if m.get("type") == "video" or m.get("type") == "animated_gif":
                    # Prefer HD variant
                    variants = m.get("variants", [])
                    video_url = ""
                    max_bitrate = -1
                    for v in variants:
                        if v.get("content_type") == "video/mp4":
                            bitrate = int(v.get("bitrate", 0) or 0)
                            if bitrate > max_bitrate:
                                max_bitrate = bitrate
                                video_url = v.get("url", "")
                    if not video_url:
                        video_url = m.get("url", "")
                    if video_url:
                        media_urls.append(video_url)
                else:
                    # Photos / other
                    img_url = m.get("url", "") or m.get("media_url_https", "")
                    if img_url:
                        media_urls.append(img_url)

            # Quoted tweet text
            quote_texts: list[str] = []
            quoted = tweet.get("quoted", {})
            if quoted:
                qt = quoted.get("text") or quoted.get("full_text") or ""
                if qt:
                    quote_texts.append(qt)

            # Thread / reply chain
            thread_texts: list[str] = []
            thread = tweet.get("thread", []) or tweet.get("conversation", []) or []
            for t in thread:
                t_text = t.get("text") or t.get("full_text", "") or ""
                if t_text and t_text != raw_text:
                    thread_texts.append(t_text)

            raw = RawScrapeResult(
                main_tweet_text=raw_text[:5000],
                thread_texts=thread_texts,
                quote_retweet_texts=quote_texts,
                media_urls=media_urls,
                screenshot_paths=[],
                author_handle=author_handle,
                author_name=author_name,
                views=views,
                likes=likes,
                reposts=reposts,
                bookmarks=bookmarks,
            )
        else:
            # Fallback: unexpected structure
            raw = RawScrapeResult(
                error=f"Unexpected fxtwitter response structure: {str(result)[:200]}"
            )

        self._save_result(raw, output_dir)

        # Download media in background
        if raw.media_urls:
            media_dir = os.path.join(output_dir, "media")
            try:
                await download_media(url, media_dir)
            except Exception as e:
                logger.warning("[FxTwitterScraper] Media download failed: %s", e)

        return raw

    @staticmethod
    def _save_result(result: RawScrapeResult, output_dir: str) -> None:
        try:
            path = os.path.join(output_dir, "raw_scrape_result.json")
            with open(path, "w", encoding="utf-8") as f:
                f.write(result.model_dump_json(indent=2))
        except Exception as e:
            logger.warning("[FxTwitterScraper] Save failed: %s", e)


class OpenCLITwitterScraper:
    """Twitter scraper — fxtwitter API primary, yt-dlp + Playwright fallback."""

    def __init__(self, timeout: int = 120) -> None:
        self.timeout = timeout
        self._fx_scraper = FxTwitterScraper(timeout=min(timeout, 30))

    async def scrape(self, url: str, output_dir: str) -> RawScrapeResult:
        logger.info("[TwitterScraper] Scraping: %s", url)
        os.makedirs(output_dir, exist_ok=True)

        # ── Step 1: fxtwitter API (primary — returns text, stats, media) ──
        result = await self._fx_scraper.scrape(url, output_dir)
        if result.main_tweet_text or result.media_urls:
            return result

        # ── Step 2: yt-dlp fallback ──
        logger.info("[TwitterScraper] fxtwitter failed, trying yt-dlp...")
        ytdlp_result = await self._try_ytdlp(url, output_dir)
        if ytdlp_result is not None and (ytdlp_result.main_tweet_text or ytdlp_result.media_urls):
            self._save_result(ytdlp_result, output_dir)
            return ytdlp_result

        # ── Step 3: Playwright screenshot ──
        logger.info("[TwitterScraper] All methods failed, Playwright screenshot only...")
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
