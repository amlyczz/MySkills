NAME = "Glassmorphism"
INTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
    position: relative; overflow: hidden;
  }
  body::before {
    content: ''; position: absolute; width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(255,255,255,0.15), transparent);
    top: -100px; right: -100px; border-radius: 50%;
  }
  body::after {
    content: ''; position: absolute; width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(255,255,255,0.1), transparent);
    bottom: -80px; left: -80px; border-radius: 50%;
  }
  .card {
    background: rgba(255,255,255,0.08); backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.15); border-radius: 24px;
    padding: 64px 80px; max-width: 1400px; text-align: center;
  }
  .title { font-size: 72px; font-weight: 700; margin-bottom: 24px; }
  .tagline { font-size: 36px; font-weight: 400; color: #e0d4f0; margin-bottom: 36px; line-height: 1.4; }
  .divider { width: 80px; height: 2px; background: #a78bfa; margin: 0 auto 36px; border-radius: 2px; }
  .points { font-size: 26px; line-height: 2.2; color: #ddd6fe; }
  .points li { list-style: none; }
  .points li::before { content: "\u25cf "; color: #a78bfa; }
</style></head><body>
  <div class="card">
    <div class="title">{title}</div>
    <div class="tagline">{tagline}</div>
    <div class="divider"></div>
    <ul class="points">{points}</ul>
  </div>
</body></html>"""

OUTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
    position: relative; overflow: hidden;
  }
  body::before {
    content: ''; position: absolute; width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(255,255,255,0.15), transparent);
    top: -100px; right: -100px; border-radius: 50%;
  }
  body::after {
    content: ''; position: absolute; width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(255,255,255,0.1), transparent);
    bottom: -80px; left: -80px; border-radius: 50%;
  }
  .card {
    background: rgba(255,255,255,0.08); backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.15); border-radius: 24px;
    padding: 64px 80px; max-width: 1400px; text-align: center;
  }
  .url { font-size: 52px; font-weight: 700; margin-bottom: 20px; }
  .stats { font-size: 30px; color: #e0d4f0; margin-bottom: 36px; }
  .divider { width: 80px; height: 2px; background: #a78bfa; margin: 0 auto 36px; }
  .summary { font-size: 30px; color: #ddd6fe; line-height: 1.6; }
</style></head><body>
  <div class="card">
    <div class="url">{url}</div>
    <div class="stats">{stats}</div>
    <div class="divider"></div>
    <div class="summary">{summary}</div>
  </div>
</body></html>"""
