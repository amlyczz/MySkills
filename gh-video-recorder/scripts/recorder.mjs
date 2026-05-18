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
  return parsed.pathname.replace(/\//g, '_').replace(/^_/, '');
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

// Read proxy config
let PROXY_CONFIG = null;
try {
  if (fs.existsSync(PROXY_CONFIG_PATH)) {
    PROXY_CONFIG = JSON.parse(fs.readFileSync(PROXY_CONFIG_PATH, 'utf8'));
  }
} catch (e) {
  console.warn(`Warning: Failed to read proxy.json: ${e.message}`);
}
if (PROXY_CONFIG && PROXY_CONFIG.enabled) {
  const host = PROXY_CONFIG.host || (PROXY_CONFIG.platform === 'wsl' ? 'host.docker.internal' : '127.0.0.1');
  const proxyUrl = `http://${host}:${PROXY_CONFIG.port}`;
  console.log(`Proxy: ${proxyUrl}`);
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
  // Target ~350px/s average speed (natural browsing pace)
  // Cap at 50% of total video duration to leave room for intro/outro/images
  const speedBasedTime = (totalHeight / 350) * 1000;
  const maxScrollTime = totalDurationSec * 0.50 * 1000;
  return Math.max(10000, Math.min(speedBasedTime, maxScrollTime));
}

// ── Helper: smooth scrolling via mouse.wheel() at 60fps ────────────
// Three-phase velocity: quick ramp-up → cruise → gentle slow-down
// mouse.wheel() is the only scroll method that Playwright video recording captures.
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

  // Scroll to top first
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const fpsTarget = 60;
  const intervalMs = Math.floor(1000 / fpsTarget);
  const totalSteps = Math.ceil(scrollDurationMs / intervalMs);

  // Three-phase velocity curve:
  //   ramp-up  0%–8%    fast accelerate (quick start, not sluggish)
  //   cruise   8%–90%   steady high speed
  //   slow-down 90%–100% gentle deceleration to stop
  function progressCurve(t) {
    if (t < 0.08) {
      // Quadratic ease-in (fast ramp, not cubic sluggishness)
      const seg = t / 0.08;
      return 0.08 * 0.5 * seg * seg; // covers ~3.2% of distance in 8% of time
    } else if (t < 0.90) {
      // Linear cruise: map [0.08, 0.90] → [~0.032, ~0.93]
      const cruiseStart = 0.032;
      const cruiseEnd = 0.93;
      return cruiseStart + (cruiseEnd - cruiseStart) * ((t - 0.08) / 0.82);
    } else {
      // Quadratic ease-out
      const seg = (t - 0.90) / 0.10;
      return 0.93 + 0.07 * (1 - (1 - seg) * (1 - seg));
    }
  }

  let lastScrollPos = 0;

  for (let step = 0; step < totalSteps; step++) {
    const progress = (step + 1) / totalSteps;
    const easedProgress = progressCurve(progress);
    const targetScrollPos = Math.round(easedProgress * scrollDistance);
    const wheelDelta = targetScrollPos - lastScrollPos;

    if (wheelDelta > 0) {
      await page.mouse.wheel(0, wheelDelta);
      lastScrollPos = targetScrollPos;
    }

    await page.waitForTimeout(intervalMs);

    // Early exit if reached bottom
    if (step % 30 === 0) {
      const atBottom = await page.evaluate(() => {
        const scrollPos = window.scrollY + window.innerHeight;
        return scrollPos >= document.body.scrollHeight - 100;
      });
      if (atBottom) break;
    }
  }

  // Brief pause at bottom
  await page.waitForTimeout(500);
}

// ── Helper: extract and filter images ─────────────────────────────
async function extractMedia(page, materialsDir) {
  const candidates = await page.evaluate((blacklistStr) => {
    const blacklist = blacklistStr.split(',');
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.map(img => ({
      src: img.src,
      // GitHub camo: data-canonical-src holds the original URL
      canonicalSrc: img.getAttribute('data-canonical-src') || '',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    })).filter(item => {
      if (!item.src.startsWith('http')) return false;
      if (item.naturalWidth < 200 || item.naturalHeight < 200) return false;
      // Check blacklist against both src and canonicalSrc
      for (const domain of blacklist) {
        if (item.src.includes(domain)) return false;
        if (item.canonicalSrc && item.canonicalSrc.includes(domain)) return false;
      }
      return true;
    });
  }, URL_BLACKLIST.join(','));

  console.log(`  Found ${candidates.length} candidate images after filtering`);

  fs.mkdirSync(materialsDir, { recursive: true });
  const downloaded = [];
  let idx = 0;

  for (const item of candidates) {
    try {
      // Download via page context (goes through Playwright proxy automatically)
      const result = await page.evaluate(async (url) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timer);
          if (!res.ok) return null;
          const contentType = res.headers.get('content-type') || '';
          const buffer = await res.arrayBuffer();
          return { data: Array.from(new Uint8Array(buffer)), contentType };
        } catch (e) {
          return null;
        }
      }, item.src);

      if (!result || !result.data) continue;
      const buffer = Buffer.from(result.data);

      // File size filter: skip < 10KB
      if (buffer.length < 10 * 1024) continue;

      // Determine extension from Content-Type header
      const contentType = result.contentType;
      let ext = '.png';
      if (contentType.includes('svg')) ext = '.svg';
      else if (contentType.includes('jpeg')) ext = '.jpg';
      else if (contentType.includes('webp')) ext = '.webp';
      else if (contentType.includes('gif')) ext = '.gif';

      const urlPath = new URL(item.src).pathname;
      const basename = path.basename(urlPath, path.extname(urlPath)).substring(0, 30);
      const filename = `${String(idx + 1).padStart(2, '0')}-${basename}${ext}`;

      fs.writeFileSync(path.join(materialsDir, filename), buffer);

      // Convert SVG to PNG (ffmpeg can't handle SVGs)
      if (filename.endsWith('.svg')) {
        const svgPath = path.join(materialsDir, filename);
        const pngName = filename.replace('.svg', '.png');
        const pngPath = path.join(materialsDir, pngName);
        try {
          const svgContent = fs.readFileSync(svgPath, 'utf8');
          const b64 = Buffer.from(svgContent).toString('base64');
          const svgPage = await page.context().newPage();
          await svgPage.goto('data:image/svg+xml;base64,' + b64, { waitUntil: 'load', timeout: 15000 });
          await svgPage.waitForTimeout(300);
          await svgPage.screenshot({ path: pngPath, type: 'png' });
          await svgPage.close();
          fs.unlinkSync(svgPath);
          downloaded.push(pngName);
          idx++;
          continue;
        } catch (e) {
          console.warn(`    SVG→PNG failed for ${filename}: ${e.message}`);
        }
      }

      downloaded.push(filename);
      idx++;
    } catch (e) {
      console.warn(`    Failed to download image: ${e.message}`);
    }
  }

  return downloaded;
}

// ── Helper: close cookie popups ────────────────────────────────────
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

// ── Main: record a single page (record + extract + trim) ──────────
// Returns { mp4Name, duration, images } or null on failure
async function recordAndExtract(browser, url, outputName) {
  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 },
    },
  };
  if (PROXY_CONFIG && PROXY_CONFIG.enabled) {
    const host = PROXY_CONFIG.host || (PROXY_CONFIG.platform === 'wsl' ? 'host.docker.internal' : '127.0.0.1');
    contextOptions.proxy = { server: `http://${host}:${PROXY_CONFIG.port}` };
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // Track wall-clock time from context creation (≈ video start)
  const videoStartTime = Date.now();
  let images = [];

  try {
    console.log(`Loading: ${url}`);

    // Use 'domcontentloaded' — 'load'/'networkidle' can hang forever on GitHub (JS resources never finish)
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

    // Smooth scroll via mouse.wheel() at 60fps with easeInOutCubic
    await smoothScroll(page, scrollDurationMs);

    // Extract images from the loaded page
    console.log('  Extracting images...');
    images = await extractMedia(page, MATERIALS_DIR);
    console.log(`  Extracted ${images.length} images`);

    // Record time AFTER all page interactions (before context.close)
    const scrollEndTime = Date.now();
    const usefulEndSec = (scrollEndTime - videoStartTime) / 1000;

    // Store trim info for post-processing
    context._trimStart = preScrollSec;
    context._trimEnd = usefulEndSec;

  } finally {
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
      return { mp4Name: null, images };
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

    // Step 2: Trim pre-scroll wait from video
    // Add 1s buffer before scroll starts so the viewer sees a brief still of the loaded page
    const trimFrom = Math.max(0, trimStart - 1.5);
    const mp4Name = outputName + '.mp4';
    const mp4Path = path.join(OUTPUT_DIR, mp4Name);

    if (trimFrom > 2) {
      console.log(`Trimming pre-scroll wait: -ss ${trimFrom.toFixed(1)}s`);
      if (trimEnd) {
        // Trim both start and end (remove image extraction time at end)
        const duration = (trimEnd - trimFrom + 1.5).toFixed(1);
        execSync(`ffmpeg -y -ss ${trimFrom} -i "${rawMp4Path}" -t ${duration} -c:v libx264 -preset fast -pix_fmt yuv420p "${mp4Path}"`, { stdio: 'pipe' });
      } else {
        execSync(`ffmpeg -y -ss ${trimFrom} -i "${rawMp4Path}" -c:v libx264 -preset fast -pix_fmt yuv420p "${mp4Path}"`, { stdio: 'pipe' });
      }
      fs.unlinkSync(rawMp4Path);
    } else {
      // No significant pre-scroll wait, just rename
      fs.renameSync(rawMp4Path, mp4Path);
    }

    // Get duration via ffprobe
    const probe = execSync(`ffprobe -v quiet -print_format json -show_format "${mp4Path}"`).toString();
    const duration = parseFloat(JSON.parse(probe).format.duration);

    return { mp4Name, duration: Math.round(duration * 10) / 10, images };
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

  const manifest = [];
  const seenImages = new Set();

  for (const url of urls) {
    const name = repoNameFromUrl(url);
    const result = await recordAndExtract(browser, url, name);

    if (result.mp4Name) {
      manifest.push({ type: 'video', path: result.mp4Name, duration: result.duration });
      console.log(`  Video: ${result.mp4Name} (${result.duration}s)`);
    }

    // Deduplicate images across URLs
    for (const img of result.images) {
      if (!seenImages.has(img)) {
        seenImages.add(img);
        manifest.push({ type: 'image', path: `materials/${img}` });
      }
    }
  }

  // Write manifest_full.json
  const manifestPath = path.join(OUTPUT_DIR, 'manifest_full.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  await browser.close();

  console.log('\n── Recording Complete ──');
  console.log(`Manifest: ${manifestPath}`);
  console.log(`  Videos: ${manifest.filter(m => m.type === 'video').length}`);
  console.log(`  Images: ${manifest.filter(m => m.type === 'image').length}`);
  console.log(`  Total entries: ${manifest.length}`);
})();
