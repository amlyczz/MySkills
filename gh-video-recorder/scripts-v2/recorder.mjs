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
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.map(img => ({
      src: img.src,
      canonicalSrc: img.getAttribute('data-canonical-src') || '',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
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
  return candidates.map(c => c.canonicalSrc || c.src);
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
    execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -preset fast -pix_fmt yuv420p "${rawMp4Path}"`, { stdio: 'pipe' });
    fs.unlinkSync(webmPath);

    // Step 2: Download and save images (after recording stops)
    fs.mkdirSync(MATERIALS_DIR, { recursive: true });
    console.log(`  Downloading ${imageUrls.length} images...`);
    const downloadedImages = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const name = await downloadImage(imageUrls[i], MATERIALS_DIR);
      if (name) downloadedImages.push(name);
    }
    console.log(`  Downloaded ${downloadedImages.length} images`);

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
      execSync(`ffmpeg -y -ss ${trimFrom} -i "${rawMp4Path}" -t ${duration} -c:v libx264 -preset fast -pix_fmt yuv420p "${mp4Path}"`, { stdio: 'pipe' });
      fs.unlinkSync(rawMp4Path);
    } else if (trimFrom > 2) {
      console.log(`Trimming pre-scroll wait: -ss ${trimFrom.toFixed(1)}s`);
      execSync(`ffmpeg -y -ss ${trimFrom} -i "${rawMp4Path}" -c:v libx264 -preset fast -pix_fmt yuv420p "${mp4Path}"`, { stdio: 'pipe' });
      fs.unlinkSync(rawMp4Path);
    } else {
      fs.renameSync(rawMp4Path, mp4Path);
    }

    // Get duration via ffprobe
    const probe = execSync(`ffprobe -v quiet -print_format json -show_format "${mp4Path}"`).toString();
    const duration = parseFloat(JSON.parse(probe).format.duration);

    return { mp4Name, duration: Math.round(duration * 10) / 10, images: downloadedImages, extractedVideos: downloadedVideos, keyLinks };
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

  for (const url of urls) {
    try {
      const name = repoNameFromUrl(url);
      // Only discover key links for the primary REPO_URL
      const isFirstUrl = url === urls[0];
      const result = await recordAndExtract(browser, url, name, { discoverLinks: isFirstUrl });

      if (result.mp4Name) {
        manifest.entries.push({ type: 'scroll_video', path: result.mp4Name, duration: result.duration });
        console.log(`  Scroll video: ${result.mp4Name} (${result.duration}s)`);
      }

      // Add extracted videos
      if (result.extractedVideos) {
        for (const ev of result.extractedVideos) {
          manifest.entries.push({ type: 'extracted_video', path: ev.path, duration: ev.duration });
          console.log(`  Extracted video: ${ev.path} (${ev.duration}s)`);
        }
      }

      // Process key links: record each discovered link page
      if (result.keyLinks && result.keyLinks.length > 0) {
        console.log(`  Recording ${result.keyLinks.length} discovered key links...`);
        for (const link of result.keyLinks) {
          try {
            const linkName = repoNameFromUrl(link.url);
            const linkResult = await recordAndExtract(browser, link.url, 'link_' + linkName, { discoverLinks: false });
            if (linkResult && linkResult.mp4Name) {
              manifest.entries.push({ type: 'link_video', path: linkResult.mp4Name, duration: linkResult.duration });
              console.log(`  Link video: ${linkResult.mp4Name} (${linkResult.duration}s) — ${link.label}`);
            }
          } catch (e) {
            console.error(`    ERROR recording key link ${link.url}: ${e.message}`);
          }
        }
      }

      // Deduplicate images across URLs
      if (result.images) {
        for (const img of result.images) {
          if (!seenImages.has(img)) {
            seenImages.add(img);
            manifest.entries.push({ type: 'image', path: `materials/${img}` });
          }
        }
      }
    } catch (e) {
      console.error(`  ERROR recording ${url}: ${e.message}`);
      // Continue to next URL
    }
  }

  // Write manifest_full.json
  const manifestPath = path.join(OUTPUT_DIR, 'manifest_full.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  await browser.close();

  console.log('\n── Recording Complete ──');
  console.log(`Manifest: ${manifestPath}`);
  console.log(`  Scroll videos: ${manifest.entries.filter(m => m.type === 'scroll_video').length}`);
  console.log(`  Extracted videos: ${manifest.entries.filter(m => m.type === 'extracted_video').length}`);
  console.log(`  Link videos: ${manifest.entries.filter(m => m.type === 'link_video').length}`);
  console.log(`  Images: ${manifest.entries.filter(m => m.type === 'image').length}`);
  console.log(`  Total entries: ${manifest.entries.length}`);
})();
