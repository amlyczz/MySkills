NAME = "Light Teal Gradient"
INTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: linear-gradient(135deg, #e0f7fa, #80deea, #26c6da);
    color: #1a237e; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .title { font-size: 72px; font-weight: 700; margin-bottom: 24px; text-align: center; }
  .tagline { font-size: 36px; font-weight: 400; color: #283593; margin-bottom: 48px; text-align: center; max-width: 1400px; line-height: 1.4; }
  .divider { width: 120px; height: 3px; background: #00838f; margin-bottom: 48px; border-radius: 2px; }
  .points { font-size: 28px; line-height: 2; color: #37474f; }
  .points li { list-style: none; }
  .points li::before { content: "\u25b8 "; color: #00838f; font-weight: bold; }
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
    background: linear-gradient(135deg, #e0f7fa, #80deea, #26c6da);
    color: #1a237e; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .url { font-size: 56px; font-weight: 700; margin-bottom: 20px; }
  .stats { font-size: 32px; color: #283593; margin-bottom: 48px; }
  .divider { width: 120px; height: 3px; background: #00838f; margin-bottom: 48px; border-radius: 2px; }
  .summary { font-size: 32px; color: #37474f; text-align: center; max-width: 1400px; line-height: 1.6; }
</style></head><body>
  <div class="url">{url}</div>
  <div class="stats">{stats}</div>
  <div class="divider"></div>
  <div class="summary">{summary}</div>
</body></html>"""
