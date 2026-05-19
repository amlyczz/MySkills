#!/usr/bin/env python3
"""
search_lottie.py — Search and download Lottie animations from LottieFiles.

Uses Playwright (already installed for gh-video-recorder) to search LottieFiles.
Results are cached locally to avoid repeated browser launches.

Usage:
    python3 search_lottie.py <query> [--count N] [--cache FILE] [--download-dir DIR]

Output:
    Prints JSON array of matched animations with metadata.
    If --download-dir is set, downloads the JSON animation files to that directory.
"""

import json
import os
import sys
import argparse
import hashlib
import time
import subprocess
import tempfile

CACHE_FILE = os.path.join(os.path.dirname(__file__), '.lottie_cache.json')
PLAYWRIGHT_SCRIPT = os.path.join(os.path.dirname(__file__), '_lottie_search.mjs')


def load_cache(cache_path):
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return json.load(f)
    return {}


def save_cache(cache_path, cache):
    with open(cache_path, 'w') as f:
        json.dump(cache, f, indent=2)


def search_via_playwright(query, max_results, cache_path, download_dir):
    """Use Playwright to search LottieFiles and extract animation metadata."""
    cache_key = hashlib.md5(f"{query}:{max_results}".encode()).hexdigest()
    cache = load_cache(cache_path)

    # Check cache first
    if cache_key in cache:
        print(f"  [Lottie] Using cached results for '{query}'", file=sys.stderr)
        return cache[cache_key]

    print(f"  [Lottie] Searching LottieFiles for '{query}'...", file=sys.stderr)

    # Write the Playwright search script
    script_content = f'''
import {{ chromium }} from "playwright";

const query = "{query}";
const maxResults = {max_results};
const downloadDir = {json.dumps(download_dir or "")};

async function main() {{
  const browser = await chromium.launch({{ headless: true }});
  const context = await browser.newContext({{
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  }});
  const page = await context.newPage();

  try {{
    // Try multiple API endpoints that LottieFiles uses internally
    const urls = [
      `https://lottiefiles.com/api/v1/search/${{encodeURIComponent(query)}}?page=1`,
      `https://lottiefiles.com/api/search?q=${{encodeURIComponent(query)}}&page=1`,
      `https://lottiefiles.com/api/v1/search?query=${{encodeURIComponent(query)}}`,
    ];

    let results = [];
    for (const url of urls) {{
      try {{
        const resp = await page.goto(url, {{ waitUntil: "domcontentloaded", timeout: 10000 }});
        const body = await page.evaluate(() => document.body.innerText);
        if (body && !body.includes("Just a moment")) {{
          try {{
            const data = JSON.parse(body);
            const items = data.data || data.results || data.animations || [];
            results = items.slice(0, maxResults).map(item => ({{
              id: item.id || item.uuid,
              title: item.title || item.name || "Untitled",
              slug: item.slug || "",
              url: `https://lottiefiles.com/animations/${{item.slug || item.id}}`,
              jsonUrl: item.jsonUrl || item.json_url || item.downloadUrl || item.download_url || "",
              previewUrl: item.previewUrl || item.preview_url || item.imageUrl || "",
              tags: item.tags || [],
              likes: item.likes || 0,
            }}));
            break;
          }} catch {{}}
        }}
      }} catch {{}}
    }}

    // Fallback: search the web page directly
    if (results.length === 0) {{
      console.log("[Fallback] Searching via page navigation");
      await page.goto(`https://lottiefiles.com/search?q=${{encodeURIComponent(query)}}`, {{
        waitUntil: "networkidle",
        timeout: 15000,
      }});
      await page.waitForTimeout(3000);

      results = await page.evaluate((max) => {{
        const items = [];
        const cards = document.querySelectorAll('[data-animation-id], .animation-card, a[href*="/animations/"]');
        let count = 0;
        for (const card of cards) {{
          if (count >= max) break;
          const link = card.closest("a") || card.querySelector("a");
          const href = link ? link.getAttribute("href") : "";
          const img = card.querySelector("img");
          const title = card.getAttribute("title") || card.querySelector(".title, .name, h3, h4")?.textContent || "";
          items.push({{
            id: card.getAttribute("data-animation-id") || href.split("-").pop() || "",
            title: title.trim(),
            slug: href.split("/").pop() || "",
            url: href.startsWith("http") ? href : `https://lottiefiles.com${{href}}`,
            jsonUrl: "",
            previewUrl: img ? img.getAttribute("src") || img.getAttribute("data-src") || "" : "",
          }});
          count++;
        }}
        return items;
      }}, maxResults);
    }}

    // Download JSON files if download_dir is specified
    if (downloadDir && results.length > 0) {{
      const fs = await import("fs");
      const path = await import("path");
      fs.mkdirSync(downloadDir, {{ recursive: true }});

      for (const item of results) {{
        // Try to get the JSON URL
        if (!item.jsonUrl) {{
          try {{
            await page.goto(item.url, {{ waitUntil: "domcontentloaded", timeout: 10000 }});
            item.jsonUrl = await page.evaluate(() => {{
              const btn = document.querySelector('[data-download-url], .download-btn, a[href$=".json"]');
              if (btn) return btn.getAttribute("href") || btn.getAttribute("data-download-url") || "";
              // Try to find Lottie JSON in page data
              const scripts = document.querySelectorAll("script");
              for (const s of scripts) {{
                try {{
                  const data = JSON.parse(s.textContent || "{{}}");
                  if (data.jsonUrl || data.downloadUrl) return data.jsonUrl || data.downloadUrl;
                }} catch {{}}
              }}
              return "";
            }});
          }} catch {{}}
        }}

        // Download the JSON
        if (item.jsonUrl) {{
          const jsonPath = path.join(downloadDir, `${{item.id || item.slug || "unknown"}}.json`);
          try {{
            const resp = await page.goto(item.jsonUrl, {{ timeout: 10000 }});
            const jsonContent = await page.evaluate(() => document.body.textContent);
            // Verify it's valid JSON
            JSON.parse(jsonContent);
            fs.writeFileSync(jsonPath, jsonContent, "utf-8");
            item.localPath = jsonPath;
          }} catch (e) {{
            console.error(`[Lottie] Failed to download ${{item.id}}: ${{e.message}}`);
          }}
        }}
      }}
    }}

    await browser.close();
    console.log(JSON.stringify(results));
  }} catch (err) {{
    await browser.close();
    console.log(JSON.stringify([]));
    console.error("[Lottie] Error:", err.message);
  }}
}}

main();
'''

    # Write temp script
    script_path = os.path.join(os.path.dirname(__file__), '_lottie_search.mjs')
    with open(script_path, 'w') as f:
        f.write(script_content)

    try:
        result = subprocess.run(
            ['node', script_path],
            capture_output=True, text=True, timeout=60,
            cwd=os.path.dirname(__file__)
        )

        # Parse JSON output from stdout
        for line in result.stdout.strip().split('\n'):
            line = line.strip()
            if line.startswith('['):
                items = json.loads(line)
                break
        else:
            items = []

        # Cache and return
        cache[cache_key] = items
        save_cache(cache_path, cache)
        return items

    except subprocess.TimeoutExpired:
        print(f"  [Lottie] Search timed out for '{query}'", file=sys.stderr)
        return []
    except Exception as e:
        print(f"  [Lottie] Search error: {e}", file=sys.stderr)
        return []
    finally:
        if os.path.exists(script_path):
            os.unlink(script_path)


def search(query, count=5, cache_file=CACHE_FILE, download_dir=None):
    """Search for Lottie animations matching the query."""
    return search_via_playwright(query, count, cache_file, download_dir)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Search LottieFiles for animations')
    parser.add_argument('query', help='Search keywords')
    parser.add_argument('--count', type=int, default=5, help='Max results')
    parser.add_argument('--cache', default=CACHE_FILE, help='Cache file path')
    parser.add_argument('--download-dir', default=None, help='Directory to download JSON files')

    args = parser.parse_args()
    results = search(args.query, args.count, args.cache, args.download_dir)
    print(json.dumps(results, indent=2, ensure_ascii=False))
