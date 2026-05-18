NAME = "Sakura Pink"
INTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: linear-gradient(135deg, #fce4ec, #f8bbd0, #f48fb1);
    color: #4a1a2e; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .title { font-size: 72px; font-weight: 700; margin-bottom: 24px; text-align: center; }
  .tagline { font-size: 34px; font-weight: 400; color: #6a1b3a; margin-bottom: 48px; text-align: center; max-width: 1400px; line-height: 1.4; }
  .divider { width: 80px; height: 3px; background: #d81b60; margin-bottom: 48px; border-radius: 2px; }
  .points { font-size: 26px; line-height: 2; color: #4a1a2e; }
  .points li { list-style: none; }
  .points li::before { content: "\U0001f338 "; }
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
    background: linear-gradient(135deg, #fce4ec, #f8bbd0, #f48fb1);
    color: #4a1a2e; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .url { font-size: 52px; font-weight: 700; margin-bottom: 20px; }
  .stats { font-size: 30px; color: #6a1b3a; margin-bottom: 48px; }
  .divider { width: 80px; height: 3px; background: #d81b60; margin-bottom: 48px; }
  .summary { font-size: 30px; color: #4a1a2e; text-align: center; max-width: 1400px; line-height: 1.6; }
</style></head><body>
  <div class="url">{url}</div>
  <div class="stats">{stats}</div>
  <div class="divider"></div>
  <div class="summary">{summary}</div>
</body></html>"""
