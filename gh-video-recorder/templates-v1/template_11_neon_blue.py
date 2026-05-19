NAME = "Neon Blue Glow"
INTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: linear-gradient(135deg, #0a0020, #1a0050, #0d0030);
    color: #fff; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .title { font-size: 72px; font-weight: 700; margin-bottom: 24px; text-align: center;
    text-shadow: 0 0 20px rgba(100,100,255,0.8), 0 0 60px rgba(100,100,255,0.4); }
  .tagline { font-size: 34px; font-weight: 400; color: #a0a0ff; margin-bottom: 48px; text-align: center; max-width: 1400px; line-height: 1.4; }
  .divider { width: 80px; height: 2px; background: #6464ff; margin-bottom: 48px; box-shadow: 0 0 10px #6464ff; }
  .points { font-size: 26px; line-height: 2; color: #c0c0ff; }
  .points li { list-style: none; }
  .points li::before { content: "\u26a1 "; color: #6464ff; }
</style></head><body>
  <div class="title">{title}</div>
  <div class="tagline">{tagline}</div>
  <div class="divider"></div>
  <ul class="points">{points}</ul>
</body></html>"""

OUTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: linear-gradient(135deg, #0a0020, #1a0050, #0d0030);
    color: #fff; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .url { font-size: 52px; font-weight: 700; margin-bottom: 20px;
    text-shadow: 0 0 15px rgba(100,100,255,0.6); }
  .stats { font-size: 30px; color: #a0a0ff; margin-bottom: 48px; }
  .divider { width: 80px; height: 2px; background: #6464ff; margin-bottom: 48px; box-shadow: 0 0 10px #6464ff; }
  .summary { font-size: 30px; color: #c0c0ff; text-align: center; max-width: 1400px; line-height: 1.6; }
</style></head><body>
  <div class="url">{url}</div>
  <div class="stats">{stats}</div>
  <div class="divider"></div>
  <div class="summary">{summary}</div>
</body></html>"""
