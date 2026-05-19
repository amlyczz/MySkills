NAME = "Minimal Black & White"
INTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px; background: #0a0a0a;
    color: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .title { font-size: 80px; font-weight: 200; text-align: center; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 24px; }
  .tagline { font-size: 28px; font-weight: 300; color: #888; margin-bottom: 48px; text-align: center; max-width: 1200px; line-height: 1.5; }
  .divider { width: 60px; height: 1px; background: #444; margin-bottom: 48px; }
  .points { font-size: 24px; line-height: 2.2; color: #ccc; }
  .points li { list-style: none; }
  .points li::before { content: "\u2014 "; color: #666; }
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
    width: 1920px; height: 1080px; background: #0a0a0a;
    color: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .url { font-size: 52px; font-weight: 200; text-align: center; letter-spacing: 2px; margin-bottom: 16px; }
  .stats { font-size: 28px; font-weight: 300; color: #888; margin-bottom: 48px; }
  .divider { width: 60px; height: 1px; background: #444; margin-bottom: 48px; }
  .summary { font-size: 28px; font-weight: 300; color: #aaa; text-align: center; max-width: 1400px; line-height: 1.6; }
</style></head><body>
  <div class="url">{url}</div>
  <div class="stats">{stats}</div>
  <div class="divider"></div>
  <div class="summary">{summary}</div>
</body></html>"""
