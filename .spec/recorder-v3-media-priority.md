# Spec: recorder.mjs v3 — 媒体素材优先级 + 视频提取 + 链接发现

## 问题陈述

当前 recorder.mjs 存在以下问题：

1. **无视频提取**：`extractMedia` 只查 `<img>`，完全忽略 `<video>` 和嵌入视频（GitHub README 中常见 demo 视频/动画 GIF）
2. **录屏内容不稳定**：主循环无 try/catch，单个 URL 失败会中断全部流程
3. **时间线优先级固定**：allocate.py 按 manifest 原始顺序拼接，不区分素材类型优先级
4. **滚动速度不合理**：350 px/s 偏快，人类阅读平均约 200-250 px/s
5. **无关键链接发现**：GitHub README 中的 Demo/文档/截图链接未被利用

## 设计目标

1. 三类素材提取：滚动录屏、页面内嵌视频、页面图片
2. 最终视频按优先级排列：**视频素材 > 图片素材 > 滚动录屏**
3. 滚动速度接近人类自然浏览（~250 px/s）
4. 每个步骤独立容错，单个 URL/素材失败不影响整体
5. 可选的"关键链接发现"——解析 GitHub 页面，识别 Demo/文档链接并录屏

## 素材类型定义

| 类型 | manifest type       | 来源 | 优先级 |
|------|---------------------|------|--------|
| 视频素材 | `extracted_video`   | 页面内嵌 `<video>`、`.mp4`/`.webm` 链接、动画 GIF | 最高 (1) |
| 图片素材 | `image`             | 页面内 `<img>`（三级过滤，已有逻辑） | 中 (2) |
| 滚动录屏 | `scroll_video`      | Playwright 录制的页面滚动 | 低 (3) |
| 关键链接录屏 | `scroll_link_video` | 从 GitHub 解析出的关键链接页面滚动录屏 | 最低 (4) |

## 技术方案

### 1. recorder.mjs — 视频提取 (`extractVideos`)

新增函数，在 `extractMedia` 之后调用：

```javascript
async function extractVideos(page, materialsDir) {
  return page.evaluate(() => {
    const videos = [];
    // 1. <video> 元素
    document.querySelectorAll('video source[src], video[src]').forEach(el => {
      const src = el.src || el.getAttribute('src');
      if (src && (src.includes('.mp4') || src.includes('.webm'))) {
        videos.push(src.startsWith('http') ? src : new URL(src, location.href).href);
      }
    });
    // 2. <a href="*.mp4"> 链接
    document.querySelectorAll('a[href]').forEach(el => {
      const href = el.href;
      if (href && /\.(mp4|webm)/.test(href)) {
        videos.push(href);
      }
    });
    // 3. 动画 GIF（转为视频需要 ffmpeg，标记为 gif 类型）
    document.querySelectorAll('img[src$=".gif"]').forEach(el => {
      if (el.naturalWidth >= 200 && el.naturalHeight >= 200) {
        videos.push({ type: 'gif', src: el.src });
      }
    });
    return videos;
  });
}
```

下载逻辑：
- 视频：直接下载，15s 超时
- GIF：下载后用 ffmpeg 转为 mp4（`ffmpeg -i input.gif -movflags faststart -pix_fmt yuv420p output.mp4`）

### 2. recorder.mjs — 滚动速度调整

`computeScrollDuration` 中目标速度从 350 px/s 改为 **250 px/s**：

```javascript
const SCROLL_SPEED = 250; // px/s, 接近人类阅读速度
const speedBasedTime = (totalHeight / SCROLL_SPEED) * 1000;
```

### 3. recorder.mjs — 容错改造

主循环每个 URL 包裹 try/catch：

```javascript
for (const url of urls) {
  try {
    const result = await recordAndExtract(browser, url, name);
    // ... append to manifest
  } catch (e) {
    console.error(`  ERROR recording ${url}: ${e.message}`);
    // 继续下一个 URL
  }
}
```

### 4. recorder.mjs — 关键链接发现（可选）

新增函数 `discoverKeyLinks(page)`：

```javascript
async function discoverKeyLinks(page, repoUrl) {
  return page.evaluate((repoUrl) => {
    const links = [];
    const readme = document.querySelector('article.markdown-body');
    if (!readme) return links;

    readme.querySelectorAll('a[href]').forEach(el => {
      const href = el.href;
      const text = el.textContent.toLowerCase();
      // 匹配关键词：demo、documentation、try it、getting started
      // 排除：github.com 同域（已是当前页）、shields.io、badge
      // 排除：锚点链接 (#)、mailto:
      if (isKeyLink(href, text, repoUrl)) {
        links.push({ url: href, label: text.trim() });
      }
    });
    return links.slice(0, 3); // 最多 3 个
  }, repoUrl);
}
```

关键链接判断逻辑：
- 关键词匹配：text 包含 `demo`、`try`、`documentation`、`getting started`、`example`、`playground`
- URL 类型：非 GitHub 同域、非 badge/shield、非锚点、非 mailto
- 数量上限：3 个

### 5. manifest_full.json 新格式

```json
[
  { "type": "scroll_video", "path": "vercel-labs_zero.mp4", "duration": 24.0 },
  { "type": "extracted_video", "path": "materials/demo.mp4", "duration": 8.5 },
  { "type": "image", "path": "materials/01-screenshot.png" },
  { "type": "scroll_video", "path": "zerolang_ai.mp4", "duration": 22.5 },
  { "type": "link_video", "path": "link_demo-example.mp4", "duration": 15.0 }
]
```

### 6. allocate.py — 优先级排序

时间线构建改为按优先级分组：

```python
# 按优先级分组
extracted_videos = [m for m in manifest if m['type'] == 'extracted_video']
images = [m for m in manifest if m['type'] == 'image']
scroll_videos = [m for m in manifest if m['type'] == 'scroll_video']
link_videos = [m for m in manifest if m['type'] == 'link_video']

# 时间线：intro → 视频素材 → 图片素材 → 滚动录屏 → 关键链接录屏 → outro
timeline = [intro]
timeline += build_entries(extracted_videos, ...)
timeline += build_entries(images, ...)
timeline += build_entries(scroll_videos, ...)
timeline += build_entries(link_videos, ...)
timeline += [outro]
```

时长分配逻辑：
- 视频素材：原始时长，按比例裁剪（如果总时长超预算）
- 图片素材：每张 4-10s（Ken Burns），目标占总时长 25%
- 滚动录屏：按比例裁剪到剩余预算
- 关键链接录屏：按比例裁剪

### 7. skill.md 更新

- 新增素材类型说明
- 更新 recorder.mjs 功能列表
- 更新 allocate.py 功能列表
- 新增关键链接发现说明

## 关键文件

| 文件 | 操作 |
|------|------|
| `scripts-v2/recorder.mjs` | MODIFY：新增 extractVideos、discoverKeyLinks，滚动速度改 250px/s，主循环容错 |
| `scripts-v2/allocate.py` | MODIFY：manifest 新类型支持，优先级排序 |
| `skill.md` | MODIFY：更新功能说明 |

## 验收标准

1. `node recorder.mjs` 对含 `<video>` 的页面能提取视频素材
2. 滚动速度为 ~250 px/s（10s 内滚动约 2500px）
3. 单个 URL 录制失败不中断其他 URL
4. `manifest_full.json` 包含 `extracted_video`、`image`、`scroll_video`、`link_video` 四种类型
5. allocate.py 生成的 `concat_list.txt` 按优先级排序：视频素材 → 图片 → 滚动录屏 → 链接录屏
6. 关键链接发现为可选功能，不影响基础流程
