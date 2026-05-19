NAME = "Dark Purple Gradient"
INTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    color: #fff; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .title { font-size: 72px; font-weight: 700; margin-bottom: 24px; text-align: center; letter-spacing: -1px; }
  .tagline { font-size: 36px; font-weight: 400; color: #b8b5d0; margin-bottom: 48px; text-align: center; max-width: 1400px; line-height: 1.4; }
  .divider { width: 120px; height: 3px; background: #6c63ff; margin-bottom: 48px; border-radius: 2px; }
  .points { font-size: 28px; line-height: 2; color: #d0cee0; }
  .points li { list-style: none; }
  .points li::before { content: "\u2726 "; color: #6c63ff; }
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
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    color: #fff; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .url { font-size: 56px; font-weight: 700; margin-bottom: 20px; }
  .stats { font-size: 32px; color: #b8b5d0; margin-bottom: 48px; }
  .divider { width: 120px; height: 3px; background: #6c63ff; margin-bottom: 48px; border-radius: 2px; }
  .summary { font-size: 32px; color: #d0cee0; text-align: center; max-width: 1400px; line-height: 1.6; }
</style></head><body>
  <div class="url">{url}</div>
  <div class="stats">{stats}</div>
  <div class="divider"></div>
  <div class="summary">{summary}</div>
</body></html>"""
