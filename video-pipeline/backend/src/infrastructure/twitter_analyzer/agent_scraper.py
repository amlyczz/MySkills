"""Agent Scraper for Twitter — LLM-driven autonomous scraper using opencli.

Strategy:
1. Use opencli to navigate the Twitter/X URL and extract tweet text/thread/replies.
2. Fall back to Playwright screenshot if opencli fails.
3. Save raw content to output_dir for reproducibility.
"""

import asyncio
import json
import logging
import os
import re
from typing import Optional

from ...domain.twitter_analyzer.entities import RawScrapeResult

logger = logging.getLogger(__name__)


def _safe_json_parse(raw: str) -> Optional[dict]:
    """Try to extract and parse a JSON object from mixed text."""
    # Find first { and last }
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        candidate = raw[start:end+1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
    return None


class OpenCLITwitterScraper:
    """Twitter scraper using opencli for autonomous browsing."""

    def __init__(self, timeout: int = 120) -> None:
        self.timeout = timeout

    async def scrape(self, url: str, output_dir: str) -> RawScrapeResult:
        """Scrape a Twitter/X URL using opencli.

        Uses opencli to navigate the page, extract tweet text, thread tweets,
        replies, quoted tweets, and media URLs.
        """
        logger.info("[TwitterScraper] Scraping: %s", url)

        os.makedirs(output_dir, exist_ok=True)

        # Step 1: Try opencli to read tweet content
        raw_result = await self._try_opencli(url, output_dir)

        # Step 2: Save raw result for debugging
        raw_path = os.path.join(output_dir, "raw_scrape_result.json")
        try:
            with open(raw_path, "w", encoding="utf-8") as f:
                f.write(raw_result.model_dump_json(indent=2))
        except Exception as e:
            logger.warning("[TwitterScraper] Failed to save raw result: %s", e)

        return raw_result

    async def _try_opencli(self, url: str, output_dir: str) -> RawScrapeResult:
        """Use opencli to extract tweet content from the URL."""
        try:
            # opencli operate: navigate and extract content
            cmd = [
                "opencli", "operate",
                "--url", url,
                "--instruction", (
                    "Extract the tweet content from this page. "
                    "Return ONLY a JSON object with these fields: "
                    '"main_tweet_text" (the main tweet text), '
                    '"thread_texts" (array of thread continuation tweets, if any), '
                    '"reply_texts" (array of top reply texts, up to 10), '
                    '"quote_retweet_texts" (array of quoted retweet texts, if any), '
                    '"media_urls" (array of image/video URLs in the tweet), '
                    '"author_handle" (the @username), '
                    '"author_name" (the display name). '
                    "Do NOT include any text outside the JSON object."
                ),
                "--timeout", str(self.timeout),
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=self.timeout + 10
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.communicate()
                logger.warning("[TwitterScraper] opencli timed out for %s", url)
                return RawScrapeResult(error="opencli scrape timed out")

            stdout_text = stdout.decode("utf-8", errors="replace") if stdout else ""
            stderr_text = stderr.decode("utf-8", errors="replace") if stderr else ""

            if stderr_text:
                logger.debug("[TwitterScraper] opencli stderr: %s", stderr_text[:500])

            # Try to parse JSON from opencli output
            parsed = _safe_json_parse(stdout_text)
            if parsed:
                return RawScrapeResult(
                    main_tweet_text=parsed.get("main_tweet_text", ""),
                    thread_texts=parsed.get("thread_texts", []),
                    reply_texts=parsed.get("reply_texts", []),
                    quote_retweet_texts=parsed.get("quote_retweet_texts", []),
                    media_urls=parsed.get("media_urls", []),
                    author_handle=parsed.get("author_handle", ""),
                    author_name=parsed.get("author_name", ""),
                )
            else:
                # If JSON parsing failed, use raw text as main_tweet_text
                logger.warning("[TwitterScraper] Could not parse JSON from opencli output, using raw text")
                return RawScrapeResult(
                    main_tweet_text=stdout_text[:5000],
                    error="Could not parse structured data from opencli output",
                )

        except FileNotFoundError:
            logger.warning("[TwitterScraper] opencli not found, falling back to basic scrape")
            return RawScrapeResult(error="opencli not installed")
        except Exception as e:
            logger.error("[TwitterScraper] opencli error: %s", e)
            return RawScrapeResult(error=f"opencli scrape failed: {str(e)}")

    async def _take_screenshot(self, url: str, output_dir: str) -> Optional[str]:
        """Fallback: take a screenshot of the tweet for visual capture."""
        try:
            screenshot_path = os.path.join(output_dir, "tweet_screenshot.png")
            cmd = [
                "opencli", "operate",
                "--url", url,
                "--instruction", "Take a screenshot of this tweet page.",
                "--screenshot", screenshot_path,
                "--timeout", "60",
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=70
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.communicate()
                return None

            if os.path.exists(screenshot_path):
                return screenshot_path
            return None

        except Exception as e:
            logger.warning("[TwitterScraper] Screenshot fallback failed: %s", e)
            return None

    @staticmethod
    def _extract_tweet_id(url: str) -> str:
        """Extract tweet ID from a Twitter/X URL."""
        match = re.search(r"/status/(\d+)", url)
        return match.group(1) if match else ""
