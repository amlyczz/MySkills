NAME = "Tech Blue Grid"
INTRO_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    background: #0d1b2a;
    background-image: linear-gradient(rgba(65,105,225,0.08) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(65,105,225,0.08) 1px, transparent 1px);
    background-size: 60px 60px;
    color: #fff; font-family: 'SF Mono', Menlo, monospace;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .title { font-size: 64px; font-weight: 700; margin-bottom: 24px; text-align: center; color: #4169e1; }
  .tagline { font-size: 28px; font-weight: 400; color: #8892b0; margin-bottom: 48px; text-align: center; max-width: 1400px; line-height: 1.5; }
  .divider { width: 120px; height: 2px; background: #4169e1; margin-bottom: 48px; }
  .points { font-size: 22px; line-height: 2.2; color: #a8b2d1; }
  .points li { list-style: none; }
  .points li::before { content: "> "; color: #4169e1; font-weight: bold; }
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
    background: #0d1b2a;
    background-image: linear-gradient(rgba(65,105,225,0.08) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(65,105,225,0.08) 1px, transparent 1px);
    background-size: 60px 60px;
    color: #fff; font-family: 'SF Mono', Menlo, monospace;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 80px;
  }
  .url { font-size: 44px; font-weight: 700; margin-bottom: 20px; color: #4169e1; }
  .stats { font-size: 26px; color: #8892b0; margin-bottom: 48px; }
  .divider { width: 120px; height: 2px; background: #4169e1; margin-bottom: 48px; }
  .summary { font-size: 26px; color: #a8b2d1; text-align: center; max-width: 1400px; line-height: 1.6; }
</style></head><body>
  <div class="url">{url}</div>
  <div class="stats">{stats}</div>
  <div class="divider"></div>
  <div class="summary">{summary}</div>
</body></html>"""
