---
name: media-generation
description: >
  统一媒体生成层。将图片、语音、音乐、视频的生成抽象为统一接口，支持多 Provider 可替换、
  可组合。别名系统让调用方按用途（封面图/口播/BGM）而非按能力（image/speech/music）
  调用。当前默认 Provider 为 MiniMax（通过 mmx CLI），后续可扩展 OpenAI/DeepSeek。
triggers:
  - 生成封面图
  - 生成口播配音
  - 生成背景音乐
  - 生成视频片段
  - 用 mmx 生成媒体素材
  - 调用 MediaGenerator
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# MediaGeneration — 统一媒体生成层

你是视频 Pipeline 的媒体生成模块。调用方不关心底层是 MiniMax / OpenAI / 其他模型，只通过别名调用。

---

## 核心原则

**能用 markdown 写的 → code agent 写；需要像素/声波/视频帧的 → MediaGenerator。**

- 口播脚本、标题、文案、源码分析 → code agent 直接完成，**不走 MediaGenerator**
- MediaGenerator 只负责：图片、语音、音乐、视频
- 接口中无 `TextProvider`，配置中无 text 相关条目

---

## 模块结构

```
media_generation/
├── skill.md                  ← 本文件（agent 操作指南）
├── __init__.py               → export MediaGenerator, GenerationResult
├── media_config.json         → provider 配置 + aliases + 降级规则
├── media_generator.py        → 别名解析 → 提供者路由 → 降级链
├── providers/
│   ├── base.py               → GenerationResult, BaseProvider ABC, UnsupportedCapabilityError
│   └── minimax.py            → MiniMaxProvider: mmx CLI 包装
├── capabilities/
│   ├── image.py              → ImageRequest / ImageData / ImageResult (Pydantic)
│   ├── speech.py             → SpeechRequest / SpeechResult / VoiceInfo
│   ├── music.py              → MusicRequest / InstrumentalRequest / MusicResult
│   └── video.py              → VideoRequest / ImageToVideoRequest / VideoResult
└── utils/
    ├── download.py           → download_file(): URL → 本地文件
    └── retry.py              → retry_with_backoff(): 指数回退 + jitter
```

---

## 使用方式

### 1. 导入并实例化

```python
from media_generation import MediaGenerator

media = MediaGenerator()
```

### 2. 按别名生成

```python
# 生成封面图（3:4 竖版）
result = await media.generate("cover_image", prompt="Bold sans-serif poster...", aspect_ratio="3:4")
if result.success:
    cover_path = result.data.images[0].local_path

# 生成口播配音
result = await media.generate("voiceover", text="完整口播文本...", voice_id="male-tech-01")

# 生成 BGM
result = await media.generate("bgm", prompt="ambient electronic, subtle beat", instrumental=True)

# 生成视频片段
result = await media.generate("video_clip", prompt="a serene mountain landscape", duration=6)
```

### 3. 可用别名

| 别名 | 能力 | 默认 Provider | 典型参数 |
|------|------|--------------|---------|
| `cover_image` | image | minimax (image-01) | `prompt`, `aspect_ratio` ("3:4" / "16:9") |
| `thumbnail` | image | minimax (image-01) | `prompt`, `aspect_ratio` |
| `voiceover` | speech | minimax (speech-hd) | `text`, `voice_id`, `speed` |
| `bgm` | music | minimax (music-2.6) | `prompt`, `instrumental=True`, `duration` |
| `video_clip` | video | minimax (Hailuo-Fast) | `prompt`, `duration`, `image_path` (可选) |

---

## 在视频 Pipeline 中的位置

MediaGeneration 是横向切面，被各层调用：

```
Layer 0 (内容生成)  ──调用──→  cover_image   (生成封面)
Layer 3 (Remotion)  ──调用──→  bgm           (背景音乐)
Layer 4 (后期合成)  ──调用──→  voiceover     (TTS 配音)
                               cover_image   (最终封面)
```

---

## 降级策略

别名可配置多个 Provider，按顺序尝试：

```json
"aliases": {
  "video_clip": {
    "capability": "video",
    "providers": [
      { "provider": "minimax", "model": "MiniMax-Hailuo-2.3-Fast-6s-768p" },
      { "provider": "minimax", "model": "MiniMax-Hailuo-2.3-6s-768p" }
    ]
  }
}
```

- 第一个 Provider 成功 → 返回结果
- 所有 Provider 失败 → 返回 `GenerationResult(success=False)`，上游降级（如视频段改纯图片展示）
- 遇到 `UnsupportedCapabilityError` → 跳过该 Provider，尝试下一个

---

## Pydantic 模型

所有请求/结果类型均为 Pydantic BaseModel，支持：
- 类型校验：`ImageRequest(prompt="...", aspect_ratio="3:4")`
- JSON 序列化：`result.model_dump_json()`
- 字典转换：`request.model_dump()`

```python
from media_generation.capabilities import (
    ImageRequest, ImageResult,
    SpeechRequest, SpeechResult,
    MusicRequest, MusicResult,
    VideoRequest, VideoResult,
)
```

---

## 扩展 Provider

新增 Provider 只需：

1. 继承 `BaseProvider`，实现 `name`、`supported_capabilities`、`generate()`
2. 在 `media_config.json` 的 `providers` 中添加配置
3. 在 `MediaGenerator._init_providers()` 中注册

```python
from media_generation.providers.base import BaseProvider, GenerationResult

class MyProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "my-provider"

    @property
    def supported_capabilities(self) -> list[str]:
        return ["image", "speech"]

    async def generate(self, capability: str, **kwargs) -> GenerationResult:
        # dispatch to generate_image / generate_speech ...
        ...
```

---

## 注意事项

- `mmx` CLI 必须已安装并配置 `MINIMAX_API_KEY`
- 所有生成通过 `asyncio.create_subprocess_exec('mmx', ...)` 走 `--quiet` 模式
- P0 不解析 `--output json`，只检查退出码 + 输出文件存在
- 视频生成使用 `retry_with_backoff`（最多 2 次重试），其他能力不重试
- MediaGenerator 是单例模式：一个实例可复用多次 `generate()` 调用
