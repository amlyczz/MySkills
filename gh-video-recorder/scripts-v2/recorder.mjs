import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Dependency check ──────────────────────────────────────────────
try {
  execSync('which ffmpeg ffprobe', { stdio: 'pipe' });
} catch {
  console.error('ERROR: ffmpeg and ffprobe are required.');
  process.exit(1);
}

// ── Helper: format date for output dir ────────────────────────────
function formatDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}`;
}

// ── Helper: parse repo name from URL ──────────────────────────────
function repoNameFromUrl(url) {
  const parsed = new URL(url);
  const fromPath = parsed.pathname.replace(/\//g, '_').replace(/^_/, '').replace(/_$/, '');
  if (fromPath) return fromPath;
  // Fallback: use hostname (e.g. zerolang.ai → zerolang.ai)
  return parsed.hostname.replace(/\./g, '_');
}

// ── Path resolution ───────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const PROJECT_DIR = path.dirname(SCRIPT_DIR); // gh-video-recorder/

// ── Environment variables ─────────────────────────────────────────
const REPO_URL = process.env.REPO_URL;
if (!REPO_URL) { console.error('ERROR: REPO_URL is required'); process.exit(1); }

const URLS_RAW = process.env.URLS || '';
const PROXY_CONFIG_PATH = path.join(PROJECT_DIR, 'proxy.json');

// Detect current platform
function detectPlatform() {
  if (process.platform === 'darwin') return 'mac';
  if (process.platform === 'linux') {
    try {
      const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
      if (version.includes('microsoft') || version.includes('wsl')) return 'wsl';
    } catch {}
    return 'linux';
  }
  return 'other';
}
const CURRENT_PLATFORM = detectPlatform();

// Read proxy config (supports both old single-format and new multi-platform format)
let PROXY_URL = null;
try {
  if (fs.existsSync(PROXY_CONFIG_PATH)) {
    const raw = JSON.parse(fs.readFileSync(PROXY_CONFIG_PATH, 'utf8'));
    let host, port;
    if (raw.mac || raw.wsl || raw.linux) {
      // New format: { "mac": {...}, "wsl": {...} } — auto-select by platform
      const cfg = raw[CURRENT_PLATFORM];
      if (cfg) { host = cfg.host; port = cfg.port; }
    } else if (raw.enabled) {
      // Old format: { "enabled": true, "platform": "mac", "port": 7890 }
      host = raw.host || (raw.platform === 'wsl' ? 'host.docker.internal' : '127.0.0.1');
      port = raw.port;
    }
    if (host && port) {
      PROXY_URL = `http://${host}:${port}`;
      console.log(`Proxy (${CURRENT_PLATFORM}): ${PROXY_URL}`);
    } else {
      console.log(`No proxy config for platform: ${CURRENT_PLATFORM}`);
    }
  }
} catch (e) {
  console.warn(`Warning: Failed to read proxy.json: ${e.message}`);
}

const DEFAULT_OUTPUT_DIR = path.join(
  PROJECT_DIR,
  'output',
  `${formatDate()}-${repoNameFromUrl(REPO_URL)}`
);
const OUTPUT_DIR = process.env.OUTPUT_DIR || DEFAULT_OUTPUT_DIR;
const TOTAL_DURATION = parseInt(process.env.TOTAL_DURATION || '180', 10);
const MATERIALS_DIR = path.join(OUTPUT_DIR, 'materials');

// URL blacklist for image filtering (checked against both src and data-canonical-src)
const URL_BLACKLIST = [
  'shields.io',
  'gravatar.com',
  'avatars.githubusercontent.com',
  'badge',
  'travis-ci.org',
  'codecov.io',
  'coveralls.io',
  'sentry.io',
  'star-history',
  'starchart',
  'api.star-history.com',
];

// ── Helper: dynamic scroll duration ──────────────────────────────
function computeScrollDuration(totalHeight, totalDurationSec) {
  // Target ~250px/s average speed (natural human reading pace)
  // Cap at 50% of total video duration to leave room for intro/outro/images
  const speedBasedTime = (totalHeight / 250) * 1000;
  const maxScrollTime = totalDurationSec * 0.50 * 1000;
  return Math.max(10000, Math.min(speedBasedTime, maxScrollTime));
}

// ── Helper: smooth scrolling via mouse.wheel() ────────────────────
// Uses mouse.wheel() from Node.js — the only method Playwright video
// recording captures frame-by-frame. 30fps interval (33ms) is reliable
// on Node.js event loop (unlike 16ms which drifts).
async function smoothScroll(page, scrollDurationMs) {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const scrollDistance = Math.max(0, totalHeight - viewportHeight);

  if (scrollDistance <= 0) {
    console.log(`  Page fits in viewport (${totalHeight}px), no scrolling needed`);
    await page.waitForTimeout(3000);
    return;
  }

  const avgSpeed = (scrollDistance / (scrollDurationMs / 1000)).toFixed(0);
  console.log(`  Scrolling ${scrollDistance}px over ${(scrollDurationMs / 1000).toFixed(1)}s (${avgSpeed}px/s)`);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const fps = 30;
  const intervalMs = Math.round(1000 / fps);
  const totalSteps = Math.ceil(scrollDurationMs / intervalMs);

  // Three-phase velocity curve
  function progressCurve(t) {
    if (t < 0.08) {
      const seg = t / 0.08;
      return 0.08 * 0.5 * seg * seg;
    } else if (t < 0.90) {
      return 0.032 + (0.93 - 0.032) * ((t - 0.08) / 0.82);
    } else {
      const seg = (t - 0.90) / 0.10;
      return 0.93 + 0.07 * (1 - (1 - seg) * (1 - seg));
    }
  }

  let lastPos = 0;

  for (let step = 0; step < totalSteps; step++) {
    const progress = (step + 1) / totalSteps;
    const targetPos = Math.round(progressCurve(progress) * scrollDistance);
    const delta = targetPos - lastPos;

    if (delta > 0) {
      await page.mouse.wheel(0, delta);
      lastPos = targetPos;
    }

    await page.waitForTimeout(intervalMs);
  }

  // Ensure bottom reached
  const remaining = scrollDistance - lastPos;
  if (remaining > 0) await page.mouse.wheel(0, remaining);
}

// ── Helper: collect image URLs only (no download, fast) ───────────
async function collectImageUrls(page) {
  const candidates = await page.evaluate((blacklistStr) => {
    const blacklist = blacklistStr.split(',');

    // Find the nearest heading before an element
    function nearestHeading(el) {
      let prev = el;
      while (prev) {
        if (/^H[1-4]$/.test(prev.tagName)) return prev.textContent.trim();
        prev = prev.previousElementSibling || prev.parentElement?.previousElementSibling;
      }
      return '';
    }

    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.map(img => ({
      src: img.src,
      canonicalSrc: img.getAttribute('data-canonical-src') || '',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      alt: (img.alt || '').trim(),
      section: nearestHeading(img),
    })).filter(item => {
      if (!item.src.startsWith('http')) return false;
      if (item.naturalWidth < 200 || item.naturalHeight < 200) return false;
      for (const domain of blacklist) {
        if (item.src.includes(domain)) return false;
        if (item.canonicalSrc && item.canonicalSrc.includes(domain)) return false;
      }
      return true;
    });
  }, URL_BLACKLIST.join(','));
  console.log(`  Found ${candidates.length} candidate images after filtering`);
  return candidates;
}

// ── Helper: download a single file via Node.js fetch ──────────────
async function fetchFile(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Use https-proxy-agent for proxy support
    const https = await import('https');
    const http = await import('http');
    const urlObj = new URL(url);
    const mod = urlObj.protocol === 'https:' ? https.default : http.default;
    const res = await new Promise((resolve, reject) => {
      const req = mod.get(url, { signal: controller.signal, rejectUnauthorized: false }, resolve);
      req.on('error', reject);
      req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    });
    clearTimeout(timer);
    if (res.statusCode !== 200) return null;
    const chunks = [];
    for await (const chunk of res) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── Helper: download and save a single image ──────────────────────
async function downloadImage(url, materialsDir) {
  const buffer = await fetchFile(url);
  if (!buffer || buffer.length < 10 * 1024) return null;
  // Determine content type from response headers — we already have the buffer
  // Use URL extension as fallback
  const urlPath = new URL(url).pathname;
  const ext = urlPath.match(/\.(svg|jpe?g|png|webp|gif)/i)?.[1].toLowerCase() || 'png';
  const extFull = ext === 'jpeg' ? '.jpg' : `.${ext}`;
  const basename = path.basename(urlPath, path.extname(urlPath)).substring(0, 30);
  const existing = fs.readdirSync(materialsDir).filter(f => f.endsWith(extFull));
  const idx = existing.length + 1;
  const filename = `${String(idx).padStart(2, '0')}-${basename}${extFull}`;
  fs.writeFileSync(path.join(materialsDir, filename), buffer);

  // Convert SVG to PNG for ffmpeg compatibility
  if (ext === 'svg') {
    return null; // Skip SVGs — they need browser rendering
  }
  return filename;
}

// ── Helper: extract videos from page ──────────────────────────────
async function collectVideoUrls(page) {
  // Collect video/GIF URLs only (no download, fast)
  const candidates = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('video source[src], video[src]').forEach(el => {
      const src = el.src || el.getAttribute('src');
      if (src && /\.(mp4|webm)/.test(src)) {
        items.push({ type: 'video', src: src.startsWith('http') ? src : new URL(src, location.href).href });
      }
    });
    document.querySelectorAll('a[href]').forEach(el => {
      const href = el.href;
      if (href && /\.(mp4|webm)/.test(href)) {
        items.push({ type: 'video', src: href });
      }
    });
    document.querySelectorAll('img[src$=".gif"]').forEach(el => {
      const src = el.src;
      if (src && src.startsWith('http') && el.naturalWidth >= 200 && el.naturalHeight >= 200) {
        items.push({ type: 'gif', src });
      }
    });
    return items;
  });

  console.log(`  Found ${candidates.length} video/GIF candidates`);
  return candidates.map(c => ({ type: c.type, src: c.src }));
}
async function dismissPopups(page) {
  try {
    const selectors = [
      'button:has-text("Accept")',
      'button:has-text("Accept all")',
      'button:has-text("同意")',
      'button:has-text("Got it")',
      'button:has-text("I agree")',
    ];
    for (const sel of selectors) {
      const btn = page.locator(sel);
      if (await btn.count() > 0) {
        await btn.first().click({ timeout: 2000 });
        break;
      }
    }
  } catch {}
}

// ── Helper: discover key links from README ────────────────────────
const KEY_LINK_KEYWORDS = ['demo', 'try', 'documentation', 'getting started', 'example', 'playground', 'live', 'website'];

async function discoverKeyLinks(page) {
  return page.evaluate((keywords) => {
    const readme = document.querySelector('article.markdown-body');
    if (!readme) return [];

    const seen = new Set();
    const results = [];

    readme.querySelectorAll('a[href]').forEach(el => {
      const href = el.href;
      const text = (el.textContent || '').toLowerCase().trim();

      // Skip if already seen
      if (seen.has(href)) return;

      // Skip non-http links
      if (!href.startsWith('http')) return;

      // Skip GitHub same-domain links
      try {
        const u = new URL(href);
        if (u.hostname === 'github.com' || u.hostname.endsWith('.github.com')) return;
        // Skip badges/shields
        if (u.hostname.includes('shields.io') || u.hostname.includes('badgen')) return;
        // Skip mailto
        if (href.startsWith('mailto:')) return;
        // Skip anchors
        if (u.hash && u.pathname === location.pathname) return;
      } catch { return; }

      // Keyword match: text must contain at least one keyword
      const matched = keywords.some(kw => text.includes(kw));
      if (!matched) return;

      seen.add(href);
      results.push({ url: href, label: el.textContent.trim() });
    });

    return results.slice(0, 3);
  }, KEY_LINK_KEYWORDS);
}

// ── Helper: download and convert a video/GIF (after recording stops) ─
async function downloadAndConvertVideo(item, idx, materialsDir) {
  try {
    const ext = item.type === 'gif' ? '.gif' : (item.src.includes('.webm') ? '.webm' : '.mp4');
    const filename = `video-${String(idx + 1).padStart(2, '0')}${ext}`;
    const filepath = path.join(materialsDir, filename);

    const buffer = await fetchFile(item.src, 30000);
    if (!buffer || buffer.length < 10 * 1024) return null;
    fs.writeFileSync(filepath, buffer);

    let finalPath = filepath;
    let finalName = filename;

    if (item.type === 'gif') {
      const mp4Name = filename.replace('.gif', '.mp4');
      const mp4Path = path.join(materialsDir, mp4Name);
      try {
        execSync(`ffmpeg -y -i "${filepath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${mp4Path}"`, { stdio: 'pipe' });
        fs.unlinkSync(filepath);
        finalPath = mp4Path; finalName = mp4Name;
      } catch (e) {
        console.warn(`    GIF→MP4 failed: ${e.message}`);
        fs.unlinkSync(filepath); return null;
      }
    }
    if (finalName.endsWith('.webm')) {
      const mp4Name = finalName.replace('.webm', '.mp4');
      const mp4Path = path.join(materialsDir, mp4Name);
      try {
        execSync(`ffmpeg -y -i "${finalPath}" -c:v libx264 -preset fast -pix_fmt yuv420p "${mp4Path}"`, { stdio: 'pipe' });
        fs.unlinkSync(finalPath); finalName = mp4Name;
      } catch { return null; }
    }

    const probePath = path.join(materialsDir, finalName);
    let duration = 5;
    try {
      const probe = execSync(`ffprobe -v quiet -print_format json -show_format "${probePath}"`).toString();
      duration = parseFloat(JSON.parse(probe).format.duration);
    } catch {}

    console.log(`    Extracted: ${finalName} (${duration.toFixed(1)}s)`);
    return { type: 'extracted_video', path: `materials/${finalName}`, duration: Math.round(duration * 10) / 10 };
  } catch (e) {
    console.warn(`    Failed to extract video: ${e.message}`);
    return null;
  }
}

// ── Helper: extract README code blocks via page.evaluate ─────────
async function collectCodeSnippets(page) {
  return page.evaluate(() => {
    const readme = document.querySelector('article.markdown-body');
    if (!readme) return [];

    const blocks = [];
    let prevHeading = '';

    // Walk all elements in order to track which heading each code block belongs to
    const walker = document.createTreeWalker(readme, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      const tag = node.tagName;
      if (/^H[1-4]$/.test(tag)) {
        prevHeading = (node.textContent || '').trim();
      }
      if (tag === 'PRE') {
        const code = node.querySelector('code');
        if (!code) continue;
        const text = code.textContent || '';
        const lang = (code.className.match(/language-(\w+)/)?.[1] || '').toLowerCase();

        // Score: higher = more useful for video
        let score = 1;
        const headingLow = prevHeading.toLowerCase();
        if (/quick.?start|install|getting.?started|setup|usage/i.test(headingLow)) score = 5;
        else if (/api|example|config/i.test(headingLow)) score = 4;
        else if (/contribut|license/i.test(headingLow)) score = 0;

        // Skip long output/log blocks
        if (text.length > 5000 && !lang) score = 0;
        if (text.split('\n').length > 200 && !lang) score = 0;

        // Skip license text blocks
        if (headingLow.includes('license') && text.length > 500) score = 0;

        if (score > 0) {
          blocks.push({
            language: lang || 'text',
            code: text.substring(0, 3000),  // trim very long blocks
            section: prevHeading || '(top)',
            score,
            lines: text.split('\n').length,
          });
        }
      }
    }

    // Sort by score desc, take top 10
    blocks.sort((a, b) => b.score - a.score);
    return blocks.slice(0, 10);
  });
}

// ── Helper: probe /docs directory via gh API ──────────────────────
async function probeDocs(repoUrl) {
  try {
    const parsed = new URL(repoUrl);
    const parts = parsed.pathname.replace(/^\//, '').split('/');
    if (parts.length < 2) return [];
    const owner = parts[0];
    const repo = parts[1];

    const result = execSync(
      `gh api repos/${owner}/${repo}/contents/docs --jq '.[].name' 2>/dev/null || echo ""`,
      { stdio: 'pipe', timeout: 30000 }
    ).toString().trim();

    if (!result) {
      // Try /docs/guides or root-level docs/ alternative patterns
      return [];
    }

    return result.split('\n').filter(f => f.endsWith('.md')).map(f => ({
      file: f,
      path: `docs/${f}`,
    }));
  } catch {
    return [];
  }
}

// ── Helper: generate material_manifest.json v2 ────────────────────
function generateV2Manifest(allResults, imageMeta, codeSnippets, docsFiles) {
  const parsed = new URL(REPO_URL);
  const parts = parsed.pathname.replace(/^\//, '').split('/');
  const fullName = parts.slice(0, 2).join('/');

  const manifest = {
    version: "2",
    repo: {
      full_name: fullName,
      url: REPO_URL,
    },
    created_at: new Date().toISOString(),
    materials: [],
  };

  let idx = { scroll: 0, img: 0, evideo: 0, link: 0, code: 0, doc: 0 };

  for (const r of allResults) {
    // Scroll video entry
    if (r.scrollMp4) {
      idx.scroll++;
      manifest.materials.push({
        id: `mat_scroll_${String(idx.scroll).padStart(3, '0')}`,
        type: "scroll_video",
        path: r.scrollMp4,
        duration: r.scrollDuration || 0,
        dimensions: [1920, 1080],
        file_size_kb: r.scrollSizeKb || 0,
        source: {
          type: "github_page",
          url: r.url,
        },
        capture: {
          method: "playwright_download",
          timestamp: new Date().toISOString(),
          retries: 0,
        },
        metadata: {},
      });
    }

    // Extracted videos
    for (const ev of (r.extractedVideos || [])) {
      idx.evideo++;
      manifest.materials.push({
        id: `mat_evideo_${String(idx.evideo).padStart(3, '0')}`,
        type: "extracted_video",
        path: ev.path,
        duration: ev.duration,
        source: {
          type: "readme_embedded",
          url: r.url,
        },
        capture: {
          method: "playwright_download",
          timestamp: new Date().toISOString(),
          retries: 0,
        },
        metadata: { conversion: ev.convertedFrom || null },
      });
    }

    // Link videos
    for (const lv of (r.linkVideos || [])) {
      idx.link++;
      manifest.materials.push({
        id: `mat_link_${String(idx.link).padStart(3, '0')}`,
        type: "link_video",
        path: lv.path,
        duration: lv.duration,
        source: {
          type: "external_link",
          url: lv.sourceUrl,
        },
        capture: {
          method: "playwright_download",
          timestamp: new Date().toISOString(),
          retries: 0,
        },
        metadata: { label: lv.label || "" },
      });
    }
  }

  // Images (deduplicated)
  for (const img of imageMeta) {
    idx.img++;
    manifest.materials.push({
      id: `mat_img_${String(idx.img).padStart(3, '0')}`,
      type: "image",
      path: `materials/${img.filename}`,
      dimensions: [img.width || 0, img.height || 0],
      file_size_kb: img.sizeKb || 0,
      source: {
        type: "readme_embedded",
        url: REPO_URL,
        original_url: img.src,
        section: img.section || "",
      },
      capture: {
        method: "playwright_download",
        timestamp: new Date().toISOString(),
        retries: 0,
      },
      metadata: {
        alt_text: img.alt || "",
        is_camo_url: !!(img.canonicalSrc),
        filter_reason: null,
      },
    });
  }

  // Code snippets
  for (const cs of codeSnippets) {
    idx.code++;
    manifest.materials.push({
      id: `mat_code_${String(idx.code).padStart(3, '0')}`,
      type: "code_snippet",
      path: `materials/${cs.filename}`,
      source: {
        type: "readme_text",
        url: REPO_URL,
        section: cs.section,
      },
      capture: {
        method: "gh_api",
        timestamp: new Date().toISOString(),
        retries: 0,
      },
      metadata: {
        language: cs.language,
        lines: cs.lines,
      },
    });
  }

  // /docs pages
  for (const doc of docsFiles) {
    idx.doc++;
    manifest.materials.push({
      id: `mat_doc_${String(idx.doc).padStart(3, '0')}`,
      type: "doc_page",
      path: doc.path,
      source: {
        type: "gh_api",
        url: `https://github.com/${fullName}/tree/main/${doc.path}`,
        section: doc.file,
      },
      capture: {
        method: "gh_api",
        timestamp: new Date().toISOString(),
        retries: 0,
      },
      metadata: {},
    });
  }

  return manifest;
}

// Returns { mp4Name, duration, images, extractedVideos, keyLinks } or null on failure
async function recordAndExtract(browser, url, outputName, { discoverLinks = false } = {}) {
  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 },
    },
  };
  if (PROXY_URL) {
    contextOptions.proxy = { server: PROXY_URL };
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // Track wall-clock time from context creation (≈ video start)
  const videoStartTime = Date.now();
  let imageUrls = [];
  let videoUrls = [];
  let keyLinks = [];
  let codeSnippets = [];

  try {
    console.log(`Loading: ${url}`);

    // Use 'domcontentloaded' to avoid hanging on incomplete resource loading
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    console.log('  Page DOM ready');

    // Wait for README content to render (GitHub-specific)
    try {
      await page.waitForSelector('article.markdown-body, .repository-content', { timeout: 30000 });
      console.log('  README content rendered');
    } catch {
      // Non-GitHub pages — continue
    }

    // Wait for lazy images to load
    try {
      await page.waitForFunction(() => {
        const imgs = document.querySelectorAll('img');
        return Array.from(imgs).every(img => img.complete);
      }, { timeout: 15000 });
    } catch {}
    await page.waitForTimeout(2000);

    await dismissPopups(page);

    // === Record scroll start time for trimming ===
    const scrollStartTime = Date.now();
    const preScrollSec = (scrollStartTime - videoStartTime) / 1000;

    // Compute scroll duration based on page height
    const totalHeight = await page.evaluate(() => document.body.scrollHeight);
    const scrollDurationMs = computeScrollDuration(totalHeight, TOTAL_DURATION);

    console.log(`  Pre-scroll wait: ${preScrollSec.toFixed(1)}s → will be trimmed`);

    // Smooth scroll — runs inside page.evaluate with rAF
    await smoothScroll(page, scrollDurationMs);

    // Record scroll end time IMMEDIATELY after scrolling
    const scrollEndTime = Date.now();
    const scrollEndSec = (scrollEndTime - videoStartTime) / 1000;

    // Brief pause at bottom (1s — captured in recording)
    await page.waitForTimeout(1000);

    // Collect URLs fast (page.evaluate is quick, < 1s)
    imageUrls = await collectImageUrls(page);
    videoUrls = await collectVideoUrls(page);
    codeSnippets = await collectCodeSnippets(page);
    if (discoverLinks) {
      keyLinks = await discoverKeyLinks(page);
    }

    // Store trim info: cut everything after scrollEnd + 1.5s buffer
    context._trimStart = preScrollSec;
    context._trimEnd = (Date.now() - videoStartTime) / 1000;
  } finally {
    // Close context IMMEDIATELY to stop recording
    const trimStart = context._trimStart || 0;
    const trimEnd = context._trimEnd;
    await context.close();

    // Find the video file (newest webm)
    const files = fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.endsWith('.webm'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(OUTPUT_DIR, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      console.warn('  Warning: no webm file found after recording');
      return { mp4Name: null, images: [], extractedVideos: [], keyLinks: [] };
    }

    const rawVideo = path.join(OUTPUT_DIR, files[0].name);
    const webmName = outputName + '.webm';
    fs.renameSync(rawVideo, path.join(OUTPUT_DIR, webmName));

    // Step 1: Convert webm → raw mp4
    const rawMp4Name = outputName + '_raw.mp4';
    const webmPath = path.join(OUTPUT_DIR, webmName);
    const rawMp4Path = path.join(OUTPUT_DIR, rawMp4Name);

    console.log(`Converting ${webmName} → ${rawMp4Name}`);
    execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 "${rawMp4Path}"`, { stdio: 'pipe' });
    fs.unlinkSync(webmPath);

    // Step 2: Download and save images (after recording stops)
    fs.mkdirSync(MATERIALS_DIR, { recursive: true });
    console.log(`  Downloading ${imageUrls.length} images...`);
    const downloadedImages = [];
    const imageMetaList = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const imgInfo = imageUrls[i];  // now contains { src, canonicalSrc, naturalWidth, naturalHeight, alt, section }
      const name = await downloadImage(imgInfo.canonicalSrc || imgInfo.src, MATERIALS_DIR);
      if (name) {
        downloadedImages.push(name);
        const imgPath = path.join(MATERIALS_DIR, name);
        let sizeKb = 0;
        try { sizeKb = Math.round(fs.statSync(imgPath).size / 1024); } catch {}
        imageMetaList.push({
          filename: name,
          src: imgInfo.canonicalSrc || imgInfo.src,
          canonicalSrc: imgInfo.canonicalSrc || '',
          width: imgInfo.naturalWidth,
          height: imgInfo.naturalHeight,
          alt: imgInfo.alt || '',
          section: imgInfo.section || '',
          sizeKb,
        });
      }
    }
    console.log(`  Downloaded ${downloadedImages.length} images`);

    // Save code snippets
    fs.mkdirSync(MATERIALS_DIR, { recursive: true });
    const savedSnippets = [];
    for (let i = 0; i < codeSnippets.length; i++) {
      const cs = codeSnippets[i];
      const filename = `snippet-${String(i + 1).padStart(2, '0')}.${cs.language}`;
      const filepath = path.join(MATERIALS_DIR, filename);
      fs.writeFileSync(filepath, cs.code);
      savedSnippets.push({ ...cs, filename });
    }
    if (savedSnippets.length > 0) {
      console.log(`  Saved ${savedSnippets.length} code snippets`);
    }

    // Download and convert videos (after recording stops)
    console.log(`  Downloading ${videoUrls.length} videos...`);
    const downloadedVideos = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const result = await downloadAndConvertVideo(videoUrls[i], i, MATERIALS_DIR);
      if (result) downloadedVideos.push(result);
    }
    console.log(`  Downloaded ${downloadedVideos.length} videos`);

    // Step 3: Trim pre-scroll wait and post-scroll tail
    const trimFrom = Math.max(0, trimStart - 1.5);
    const mp4Name = outputName + '.mp4';
    const mp4Path = path.join(OUTPUT_DIR, mp4Name);

    if (trimFrom > 2 && trimEnd) {
      const duration = (trimEnd - trimFrom).toFixed(1);
      console.log(`Trimming: -ss ${trimFrom.toFixed(1)}s, duration ${duration}s`);
      execSync(`ffmpeg -y -ss ${trimFrom} -i "${rawMp4Path}" -t ${duration} -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 "${mp4Path}"`, { stdio: 'pipe' });
      fs.unlinkSync(rawMp4Path);
    } else if (trimFrom > 2) {
      console.log(`Trimming pre-scroll wait: -ss ${trimFrom.toFixed(1)}s`);
      execSync(`ffmpeg -y -ss ${trimFrom} -i "${rawMp4Path}" -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 "${mp4Path}"`, { stdio: 'pipe' });
      fs.unlinkSync(rawMp4Path);
    } else {
      fs.renameSync(rawMp4Path, mp4Path);
    }

    // Get duration via ffprobe
    const probe = execSync(`ffprobe -v quiet -print_format json -show_format "${mp4Path}"`).toString();
    const duration = parseFloat(JSON.parse(probe).format.duration);

    return { mp4Name, duration: Math.round(duration * 10) / 10, images: downloadedImages, imageMeta: imageMetaList, extractedVideos: downloadedVideos, keyLinks, codeSnippets: savedSnippets };
  }
}

// ── Main entry ─────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(MATERIALS_DIR, { recursive: true });

  // Collect all URLs to record
  const urls = [REPO_URL];
  if (URLS_RAW) {
    for (const u of URLS_RAW.split(',').map(s => s.trim()).filter(Boolean)) {
      if (u !== REPO_URL) urls.push(u);
    }
  }

  const manifest = {
    $schema: "manifest-full-schema.json",
    version: "1",
    createdAt: new Date().toISOString(),
    repoUrl: REPO_URL,
    entries: [],
  };
  const seenImages = new Set();

  // V2: track all results and image metadata across URLs
  const allResults = [];
  const allImageMeta = [];
  const allCodeSnippets = [];
  const allLinkVideos = [];

  for (const url of urls) {
    try {
      const name = repoNameFromUrl(url);
      const isFirstUrl = url === urls[0];
      const result = await recordAndExtract(browser, url, name, { discoverLinks: isFirstUrl });

      // Track for v2 manifest
      let scrollSizeKb = 0;
      if (result.mp4Name) {
        try { scrollSizeKb = Math.round(fs.statSync(path.join(OUTPUT_DIR, result.mp4Name)).size / 1024); } catch {}
      }
      allResults.push({
        url,
        scrollMp4: result.mp4Name,
        scrollDuration: result.duration,
        scrollSizeKb,
        extractedVideos: result.extractedVideos || [],
        linkVideos: [],
      });

      if (result.mp4Name) {
        manifest.entries.push({ type: 'scroll_video', path: result.mp4Name, duration: result.duration });
        console.log(`  Scroll video: ${result.mp4Name} (${result.duration}s)`);
      }

      if (result.extractedVideos) {
        for (const ev of result.extractedVideos) {
          manifest.entries.push({ type: 'extracted_video', path: ev.path, duration: ev.duration });
          console.log(`  Extracted video: ${ev.path} (${ev.duration}s)`);
        }
      }

      // Process key links
      if (result.keyLinks && result.keyLinks.length > 0) {
        console.log(`  Recording ${result.keyLinks.length} discovered key links...`);
        for (const link of result.keyLinks) {
          try {
            const linkName = repoNameFromUrl(link.url);
            const linkResult = await recordAndExtract(browser, link.url, 'link_' + linkName, { discoverLinks: false });
            if (linkResult && linkResult.mp4Name) {
              manifest.entries.push({ type: 'link_video', path: linkResult.mp4Name, duration: linkResult.duration });
              allLinkVideos.push({ path: linkResult.mp4Name, duration: linkResult.duration, sourceUrl: link.url, label: link.label });
              console.log(`  Link video: ${linkResult.mp4Name} (${linkResult.duration}s) — ${link.label}`);
            }
          } catch (e) {
            console.error(`    ERROR recording key link ${link.url}: ${e.message}`);
          }
        }
      }

      // Store link videos on the result
      const lastResult = allResults[allResults.length - 1];
      if (lastResult) lastResult.linkVideos = allLinkVideos;

      // Deduplicate images
      if (result.images) {
        for (const img of result.images) {
          if (!seenImages.has(img)) {
            seenImages.add(img);
            manifest.entries.push({ type: 'image', path: `materials/${img}` });
          }
        }
      }

      // Collect image metadata for v2 (deduplicated)
      if (result.imageMeta) {
        for (const meta of result.imageMeta) {
          if (!seenImages.has(meta.filename)) {
            seenImages.add(meta.filename);
            allImageMeta.push(meta);
          }
        }
      }

      // Collect code snippets (only from primary URL)
      if (result.codeSnippets) {
        allCodeSnippets.push(...result.codeSnippets);
      }
    } catch (e) {
      console.error(`  ERROR recording ${url}: ${e.message}`);
    }
  }

  // Write manifest_full.json (v1, backward compat)
  const manifestPath = path.join(OUTPUT_DIR, 'manifest_full.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Write material_manifest.json (v2)
  const docsFiles = await probeDocs(REPO_URL);
  if (docsFiles.length > 0) {
    console.log(`  /docs directory found: ${docsFiles.length} .md files`);
  }
  const v2Manifest = generateV2Manifest(allResults, allImageMeta, allCodeSnippets, docsFiles);
  const v2Path = path.join(OUTPUT_DIR, 'material_manifest.json');
  fs.writeFileSync(v2Path, JSON.stringify(v2Manifest, null, 2));

  await browser.close();

  console.log('\n── Recording Complete ──');
  console.log(`Manifest v1: ${manifestPath}`);
  console.log(`Manifest v2: ${v2Path}`);
  console.log(`  Scroll videos: ${manifest.entries.filter(m => m.type === 'scroll_video').length}`);
  console.log(`  Extracted videos: ${manifest.entries.filter(m => m.type === 'extracted_video').length}`);
  console.log(`  Link videos: ${manifest.entries.filter(m => m.type === 'link_video').length}`);
  console.log(`  Images: ${manifest.entries.filter(m => m.type === 'image').length}`);
  console.log(`  Code snippets: ${allCodeSnippets.length}`);
  console.log(`  /docs files: ${docsFiles.length}`);
  console.log(`  Total v2 materials: ${v2Manifest.materials.length}`);
})();
