NAME = "Warm Yellow"
INTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: linear-gradient(135deg, #f57f17, #f9a825, #fdd835);
    color: #1a1a1a; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .title { font-size: 76px; font-weight: 800; margin-bottom: 24px; text-align: center; }
  .tagline { font-size: 34px; font-weight: 400; color: #3e2723; margin-bottom: 48px; text-align: center; max-width: 1400px; line-height: 1.4; }
  .divider { width: 100px; height: 4px; background: #bf360c; margin-bottom: 48px; border-radius: 4px; }
  .points { font-size: 26px; line-height: 2; color: #4e342e; }
  .points li { list-style: none; }
  .points li::before { content: "\u2b21 "; color: #bf360c; }
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
    background: linear-gradient(135deg, #f57f17, #f9a825, #fdd835);
    color: #1a1a1a; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .url { font-size: 52px; font-weight: 700; margin-bottom: 20px; }
  .stats { font-size: 30px; color: #3e2723; margin-bottom: 48px; }
  .divider { width: 100px; height: 4px; background: #bf360c; margin-bottom: 48px; }
  .summary { font-size: 30px; color: #4e342e; text-align: center; max-width: 1400px; line-height: 1.6; }
</style></head><body>
  <div class="url">{url}</div>
  <div class="stats">{stats}</div>
  <div class="divider"></div>
  <div class="summary">{summary}</div>
</body></html>"""
