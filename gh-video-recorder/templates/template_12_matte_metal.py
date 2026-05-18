NAME = "Matte Metal"
INTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: linear-gradient(135deg, #263238, #37474f, #455a64);
    color: #eceff1; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .title { font-size: 72px; font-weight: 300; margin-bottom: 24px; text-align: center; letter-spacing: 3px; text-transform: uppercase; }
  .tagline { font-size: 32px; font-weight: 300; color: #b0bec5; margin-bottom: 48px; text-align: center; max-width: 1400px; line-height: 1.4; }
  .divider { width: 80px; height: 2px; background: #78909c; margin-bottom: 48px; }
  .points { font-size: 24px; line-height: 2.2; color: #cfd8dc; }
  .points li { list-style: none; }
  .points li::before { content: "\u25b9 "; color: #78909c; }
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
    background: linear-gradient(135deg, #263238, #37474f, #455a64);
    color: #eceff1; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .url { font-size: 48px; font-weight: 300; margin-bottom: 20px; letter-spacing: 2px; }
  .stats { font-size: 28px; font-weight: 300; color: #b0bec5; margin-bottom: 48px; }
  .divider { width: 80px; height: 2px; background: #78909c; margin-bottom: 48px; }
  .summary { font-size: 28px; font-weight: 300; color: #cfd8dc; text-align: center; max-width: 1400px; line-height: 1.6; }
</style></head><body>
  <div class="url">{url}</div>
  <div class="stats">{stats}</div>
  <div class="divider"></div>
  <div class="summary">{summary}</div>
</body></html>"""
