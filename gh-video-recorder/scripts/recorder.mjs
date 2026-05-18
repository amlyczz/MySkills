import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ── Dependency check ──────────────────────────────────────────────
try {
  execSync('which ffmpeg ffprobe', { stdio: 'pipe' });
} catch {
  console.error('ERROR: ffmpeg and ffprobe are required. Install via: brew install ffmpeg');
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

// ── Environment variables ─────────────────────────────────────────
const REPO_URL = process.env.REPO_URL;
if (!REPO_URL) { console.error('ERROR: REPO_URL is required'); process.exit(1); }

const URLS_RAW = process.env.URLS || '';
const SCRIPT_DIR = path.dirname(path.resolve(process.argv[1]));
const PROJECT_DIR = path.dirname(SCRIPT_DIR); // gh-video-recorder/
const PROXY_CONFIG_PATH = path.join(PROJECT_DIR, 'proxy.json');

// Read proxy config
let PROXY_CONFIG = null;
try {
  if (fs.existsSync(PROXY_CONFIG_PATH)) {
    PROXY_CONFIG = JSON.parse(fs.readFileSync(PROXY_CONFIG_PATH, 'utf8'));
  }
} catch {}
if (PROXY_CONFIG && PROXY_CONFIG.enabled) {
  const host = PROXY_CONFIG.platform === 'wsl' ? 'host.docker.internal' : '127.0.0.1';
  const proxyUrl = `http://${host}:${PROXY_CONFIG.port}`;
  console.log(`Proxy: ${proxyUrl} (${PROXY_CONFIG.platform}, port ${PROXY_CONFIG.port})`);
}

const DEFAULT_OUTPUT_DIR = path.join(
  PROJECT_DIR,
  'output',
  `${formatDate()}-${repoNameFromUrl(REPO_URL)}`
);
const OUTPUT_DIR = process.env.OUTPUT_DIR || DEFAULT_OUTPUT_DIR;
const TOTAL_DURATION = parseInt(process.env.TOTAL_DURATION || '180', 10);
const MATERIALS_DIR = path.join(OUTPUT_DIR, 'materials');

// URL blacklist for image filtering
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
];

// ── Helper: dynamic scroll duration ──────────────────────────────
function computeScrollDuration(totalHeight, totalDurationSec) {
  const maxScrollTime = Math.min(totalDurationSec * 0.75 * 1000, 240000);
  const heightBasedTime = totalHeight * 20;
  return Math.max(15000, Math.min(heightBasedTime, maxScrollTime));
}

// ── Helper: scroll using page.mouse.wheel() with variable speed ──
// Uses a human-like velocity curve: accelerate → cruise → decelerate → pause
async function humanScroll(page, scrollDurationMs) {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const scrollDistance = Math.max(0, totalHeight - viewportHeight);

  if (scrollDistance <= 0) {
    console.log(`  Page fits in viewport (${totalHeight}px), no scrolling needed`);
    await page.waitForTimeout(3000);
    return;
  }

  console.log(`  Scrolling ${scrollDistance}px over ${(scrollDurationMs / 1000).toFixed(1)}s`);

  // Wait briefly for page rendering to settle before starting scroll
  await page.waitForTimeout(500);

  // Velocity curve: phases of normalized time [0.0, 1.0]
  //   accelerate  0%–15%  speed 100 → 400 px/s
  //   cruise     15%–85%  speed 400 → 500 px/s
  //   decelerate 85%–100% speed 500 → 50  px/s (no settle phase)
  const phases = [
    { tStart: 0.00, tEnd: 0.15, vStart: 100, vEnd: 400 },
    { tStart: 0.15, tEnd: 0.85, vStart: 400, vEnd: 500 },
    { tStart: 0.85, tEnd: 1.00, vStart: 500, vEnd: 50  },
  ];

  function getSpeed(progress) {
    for (const p of phases) {
      if (progress >= p.tStart && progress <= p.tEnd) {
        const segProgress = (progress - p.tStart) / (p.tEnd - p.tStart);
        return p.vStart + (p.vEnd - p.vStart) * segProgress;
      }
    }
    return 0;
  }

  // Run at ~60fps with small frequent wheel events for smooth CDP capture
  const fpsTarget = 60;
  const intervalMs = Math.floor(1000 / fpsTarget);
  const totalSteps = Math.ceil(scrollDurationMs / intervalMs);

  let accumulatedDelta = 0;
  let accumulatedPixels = 0;

  for (let step = 0; step < totalSteps; step++) {
    const progress = (step + 1) / totalSteps;
    const speed = getSpeed(progress);                         // px/s
    const targetPixels = (speed / fpsTarget);                  // px this frame
    accumulatedPixels += targetPixels;

    const wheelDelta = Math.floor(accumulatedPixels);
    if (wheelDelta > 0) {
      await page.mouse.wheel(0, wheelDelta);
      accumulatedPixels -= wheelDelta;
      accumulatedDelta += wheelDelta;
    }

    await page.waitForTimeout(intervalMs);

    // Early exit if we've scrolled enough or reached bottom
    if (accumulatedDelta >= scrollDistance) break;

    // Every ~0.5s, check actual scroll position to avoid lingering at bottom
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
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    })).filter(item => {
      if (!item.src.startsWith('http')) return false;
      if (item.naturalWidth < 200 || item.naturalHeight < 200) return false;
      for (const domain of blacklist) {
        if (item.src.includes(domain)) return false;
      }
      return true;
    });
  }, URL_BLACKLIST.join(','));

  fs.mkdirSync(materialsDir, { recursive: true });
  const downloaded = [];
  let idx = 0;

  for (const item of candidates) {
    try {
      const res = await fetch(item.src, { signal: AbortSignal.timeout(10000) });
      const buffer = Buffer.from(await res.arrayBuffer());

      // File size filter: skip < 10KB
      if (buffer.length < 10 * 1024) continue;

      // Determine extension from Content-Type header
      const contentType = res.headers.get('content-type') || '';
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
        } catch {
          // Fallback: keep original SVG filename
        }
      }

      downloaded.push(filename);
      idx++;
    } catch {}
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

// ── Main: record a single page (record + extract in one pass) ─────
// Returns { webmName, mp4Name, duration, images } or null on failure
async function recordAndExtract(browser, url, outputName) {
  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 },
    },
  };
  if (PROXY_CONFIG && PROXY_CONFIG.enabled) {
    const host = PROXY_CONFIG.platform === 'wsl' ? 'host.docker.internal' : '127.0.0.1';
    contextOptions.proxy = { server: `http://${host}:${PROXY_CONFIG.port}` };
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  let images = [];
  try {
    console.log(`Loading: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await dismissPopups(page);
    await page.waitForTimeout(1000);

    // Compute scroll duration based on page height
    const totalHeight = await page.evaluate(() => document.body.scrollHeight);
    const scrollDurationMs = computeScrollDuration(totalHeight, TOTAL_DURATION);

    // Scroll using mouse wheel (captures in video)
    await humanScroll(page, scrollDurationMs);

    // Extract images from the loaded page (same context, no reload)
    console.log('  Extracting images...');
    images = await extractMedia(page, MATERIALS_DIR);
    console.log(`  Extracted ${images.length} images`);
  } finally {
    // context.close() is required for Playwright to flush the video file
    await context.close();
  }

  // After context.close(), the webm file is finalized. Find and rename it.
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    return { webmName: null, images };
  }

  const rawVideo = path.join(OUTPUT_DIR, files[0]);
  const webmName = outputName + '.webm';
  fs.renameSync(rawVideo, path.join(OUTPUT_DIR, webmName));

  // Convert webm → mp4
  const mp4Name = webmName.replace('.webm', '.mp4');
  const webmPath = path.join(OUTPUT_DIR, webmName);
  const mp4Path = path.join(OUTPUT_DIR, mp4Name);

  console.log(`Converting ${webmName} → ${mp4Name}`);
  execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -preset fast -pix_fmt yuv420p "${mp4Path}"`, { stdio: 'pipe' });
  fs.unlinkSync(webmPath);

  // Get duration via ffprobe
  const probe = execSync(`ffprobe -v quiet -print_format json -show_format "${mp4Path}"`).toString();
  const duration = parseFloat(JSON.parse(probe).format.duration);

  return { webmName, mp4Name, duration: Math.round(duration * 10) / 10, images };
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
