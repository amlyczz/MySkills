NAME = "Dark Red Luxury"
INTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: linear-gradient(135deg, #1a0000, #4a0000, #6b1a1a);
    color: #f5e6e6; font-family: Georgia, 'Times New Roman', serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .title { font-size: 72px; font-weight: 700; margin-bottom: 24px; text-align: center; letter-spacing: 2px; }
  .tagline { font-size: 34px; font-weight: 400; color: #d4a0a0; margin-bottom: 48px; text-align: center; max-width: 1400px; line-height: 1.4; font-style: italic; }
  .divider { width: 160px; height: 1px; background: #c62828; margin-bottom: 48px; }
  .points { font-size: 28px; line-height: 2; color: #e0c0c0; }
  .points li { list-style: none; }
  .points li::before { content: "\u25c6 "; color: #c62828; }
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
    background: linear-gradient(135deg, #1a0000, #4a0000, #6b1a1a);
    color: #f5e6e6; font-family: Georgia, 'Times New Roman', serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .url { font-size: 52px; font-weight: 700; margin-bottom: 20px; }
  .stats { font-size: 30px; color: #d4a0a0; margin-bottom: 48px; }
  .divider { width: 160px; height: 1px; background: #c62828; margin-bottom: 48px; }
  .summary { font-size: 30px; color: #e0c0c0; text-align: center; max-width: 1400px; line-height: 1.6; font-style: italic; }
</style></head><body>
  <div class="url">{url}</div>
  <div class="stats">{stats}</div>
  <div class="divider"></div>
  <div class="summary">{summary}</div>
</body></html>"""
