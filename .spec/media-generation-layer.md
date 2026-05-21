# Media Generation 抽象层设计

> 将图片、语音、音乐、视频、文本的生成能力抽象为统一接口，支持多 Provider 可替换、可组合。
>
> 实现状态：P0 ✅ + P1 ✅（SpecializedText + DeepSeek + 降级链 + 本地缓存），OpenAI Provider 不需要实现

---

## 设计目标

1. **Provider 无关**：调用方不关心底层是 MiniMax / OpenAI / 其他模型，只调接口
2. **可替换**：换模型只需改配置，不动业务代码
3. **可组合**：各能力独立，按需组合（比如只要 TTS + 图片，不引入视频）
4. **可扩展**：新增 Provider 只需实现一组接口

---

## 能力矩阵 & 默认路由

```
                      口播脚本/标题/文案  ──── code agent (默认，不调外部 API)
                      源码分析/架构识别  ──── code agent (默认，不调外部 API)
  Media Generation ── 图片生成           ──── external provider
                      语音合成 (TTS)     ──── external provider
                      音乐生成           ──── external provider
                      视频生成           ──── external provider
                      特殊文本 (四言诗等)  ──── external provider (可选)
```

**核心原则：文本类任务默认走 code agent，只有 code agent 不擅长的格式（四言诗、歌词押韵）或非文本任务（图/音/视频）才调外部 Provider。**

这意味着：
- Layer 0 的口播脚本、标题、文案、源码分析 → **全部由 code agent 完成**，不走 `MediaGenerator`
- `MediaGenerator` 只负责：图片、语音、音乐、视频 + 可选的特殊文本格式
- 调用方不需要 `TextProvider` 来写口播脚本，code agent 直接就写好了

---

## 在视频 Pipeline 中的位置

Media Generation 是**横向切面**，被各层调用，不属于某一层：

```
  Layer 0 (内容生成)  ──调用──→  TextProvider   (写脚本)
                      ──调用──→  ImageProvider  (生成封面)

  Layer 2 (时间线)    ──不直接调用──  (编排层，做决策不做生成)

  Layer 3 (Remotion)  ──调用──→  MusicProvider  (背景音乐)
                      ──调用──→  ImageProvider  (场景插画)

  Layer 4 (后期合成)  ──调用──→  SpeechProvider (TTS 配音)
                      ──调用──→  ImageProvider  (最终封面)
```

---

## 接口设计

### 通用约定

```typescript
// 所有 Provider 的返回结果
interface GenerationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;       // 机器可读错误码
    message: string;    // 人类可读错误信息
    provider: string;   // 出错的 Provider 名
  };
  metadata: {
    provider: string;   // 实际使用的 Provider
    model: string;      // 实际使用的模型
    duration_ms: number;// 生成耗时
    cost?: number;      // 费用（如有）
    usage?: Record<string, number>; // token 用量等
  };
}

// 通用进度回调
type ProgressCallback = (progress: {
  stage: string;        // "queued" | "generating" | "downloading" | "done"
  percent: number;      // 0-100
  message?: string;
}) => void;
```

### 1. SpecializedTextProvider — 特殊文本格式

> **注意**：口播脚本、标题、文案、源码分析等通用文本任务**不走这个接口**，直接由 code agent 完成。此接口仅用于 code agent 不擅长的**特定格式文本**（如四言诗、歌词押韵、对联）。

```typescript
interface SpecializedTextProvider {
  readonly name: string;
  readonly supported_formats: string[];  // ["classical_poem", "lyrics", "couplet"]

  generate(request: SpecializedTextRequest): Promise<GenerationResult<SpecializedTextResult>>;
}

interface SpecializedTextRequest {
  format: "classical_poem" | "lyrics" | "couplet" | "other";
  theme: string;             // 主题/内容描述
  style?: string;            // 风格参考（如"王维式田园诗"）
  length?: "short" | "medium" | "long";
  rhyme_scheme?: string;     // 押韵方案（如 AABB / ABAB）
}

interface SpecializedTextResult {
  content: string;
  format: string;
}
```

### 2. ImageProvider — 图片生成

```typescript
interface ImageProvider {
  readonly name: string;
  readonly supported_sizes: string[];  // ["1024x1024", "1024x1368", "1920x1080"]

  generate(request: ImageRequest, onProgress?: ProgressCallback): Promise<GenerationResult<ImageResult>>;
}

interface ImageRequest {
  prompt: string;
  negative_prompt?: string;
  size?: string;             // "1024x1024" | "1024x1368" | "1920x1080"
  aspect_ratio?: "1:1" | "3:4" | "16:9";
  style?: string;            // Provider 特定的风格参数
  num_images?: number;       // 生成张数，默认 1
  quality?: "standard" | "hd";
}

interface ImageResult {
  images: Array<{
    url?: string;             // 在线 URL（临时有效）
    local_path?: string;      // 本地文件路径（已下载）
    width: number;
    height: number;
    size_bytes: number;
  }>;
}
```

### 3. SpeechProvider — 语音合成

```typescript
interface SpeechProvider {
  readonly name: string;
  readonly voices: VoiceInfo[];

  /** 列出可用音色 */
  listVoices(language?: string): Promise<VoiceInfo[]>;

  /** 合成语音 */
  synthesize(request: SpeechRequest, onProgress?: ProgressCallback): Promise<GenerationResult<SpeechResult>>;
}

interface VoiceInfo {
  id: string;
  name: string;
  language: string;          // "zh-CN" | "en-US" | ...
  gender: "male" | "female" | "neutral";
  style?: string;            // "新闻播报" | "温柔" | "活泼" ...
  sample_url?: string;
}

interface SpeechRequest {
  text: string;
  voice_id: string;
  speed?: number;            // 0.5 - 2.0, 默认 1.0
  pitch?: number;            // -12 - 12
  format?: "mp3" | "wav" | "pcm";
  sample_rate?: 16000 | 24000 | 48000;
}

interface SpeechResult {
  audio_path: string;        // 本地文件路径
  format: string;
  duration_seconds: number;
  sample_rate: number;
}
```

### 4. MusicProvider — 音乐生成

```typescript
interface MusicProvider {
  readonly name: string;

  /** 生成音乐（歌词可选） */
  generate(request: MusicRequest, onProgress?: ProgressCallback): Promise<GenerationResult<MusicResult>>;

  /** 纯器乐生成（无歌词） */
  generateInstrumental(request: InstrumentalRequest, onProgress?: ProgressCallback): Promise<GenerationResult<MusicResult>>;
}

interface MusicRequest {
  prompt: string;            // 音乐风格描述
  lyrics?: string;           // 歌词（可选）
  duration?: number;         // 时长（秒），默认由 Provider 决定
  style?: string;            // "pop" | "electronic" | "orchestral" | ...
  mood?: string;             // "upbeat" | "calm" | "dramatic" | ...
  tempo?: "slow" | "medium" | "fast";
  key?: string;              // "C major" | "A minor" ...
}

interface InstrumentalRequest {
  prompt: string;
  duration?: number;
  style?: string;
  mood?: string;
  tempo?: "slow" | "medium" | "fast";
}

interface MusicResult {
  audio_path: string;
  format: string;            // "mp3" | "wav"
  duration_seconds: number;
  title?: string;
  cover_image_path?: string;
}
```

### 5. CodeAnalysisProvider — 源码分析

> **注意**：源码分析默认由 code agent 直接完成，不走外部 API。此接口仅为需要外部 LLM 辅助的场景预留（如超大型仓库、多语言混合项目）。

```typescript
interface CodeAnalysisProvider {
  readonly name: string;

  analyze(request: CodeAnalysisRequest): Promise<GenerationResult<CodeAnalysisResult>>;
}

interface CodeAnalysisRequest {
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  repo_context: {
    language: string;
    description: string;
    topics: string[];
  };
}

interface CodeAnalysisResult {
  analyzed_files: number;
  total_lines: number;
  dimensions: {
    tech_stack: string;           // LLM 自由展开：目录结构、依赖、架构模式
    core_flow: string;            // LLM 自由展开：入口点、幸福路径、数据流向
    code_quality: string;         // LLM 自由展开：设计模式、测试、CI/CD
    production_readiness: string; // LLM 自由展开：并发、安全、扩展性
  };
}
```

4 个维度各自是 LLM 自由生成的文本块，不进一步固化子字段。

### 6. VideoProvider — 视频生成

```typescript
interface VideoProvider {
  readonly name: string;

  /** 文生视频 */
  textToVideo(request: VideoRequest, onProgress?: ProgressCallback): Promise<GenerationResult<VideoResult>>;

  /** 图生视频 */
  imageToVideo(request: ImageToVideoRequest, onProgress?: ProgressCallback): Promise<GenerationResult<VideoResult>>;
}

interface VideoRequest {
  prompt: string;
  duration?: number;         // 秒，默认 6
  resolution?: "720p" | "1080p";
  style?: string;
  negative_prompt?: string;
}

interface ImageToVideoRequest {
  image_path: string;
  prompt?: string;           // 运动描述
  duration?: number;
  resolution?: "720p" | "1080p";
}

interface VideoResult {
  video_path: string;        // 本地文件路径
  duration_seconds: number;
  resolution: string;        // "1920x1080"
  format: string;            // "mp4"
  thumbnail_path?: string;   // 首帧缩略图
}
```

---

## Provider 注册 & 配置

### 配置文件（`media_config.json`）

```json
{
  "version": "1",
  "defaults": {
    "image":   { "provider": "minimax", "model": "image-01" },
    "speech":  { "provider": "minimax", "model": "speech-hd" },
    "music":   { "provider": "minimax", "model": "music-2.6" },
    "video":   { "provider": "minimax", "model": "MiniMax-Hailuo-2.3-6s-768p" },
    "specialized_text": { "provider": "minimax", "model": "MiniMax-M*" }
  },
  "providers": {
    "minimax": {
      "api_key_env": "MINIMAX_API_KEY",
      "base_url": "https://api.minimaxi.com/v1",
      "region": "cn",
      "models": {
        "image": ["image-01"],
        "speech":["speech-hd", "speech-basic"],
        "music": ["music-2.5", "music-2.6"],
        "video": ["MiniMax-Hailuo-2.3-Fast-6s-768p", "MiniMax-Hailuo-2.3-6s-768p"],
        "specialized_text": ["MiniMax-M*"]
      }
    },
    "openai": {
      "api_key_env": "OPENAI_API_KEY",
      "base_url": "https://api.openai.com/v1",
      "models": {
        "image": ["dall-e-3"],
        "speech":["tts-1", "tts-1-hd"]
      }
    },
    "deepseek": {
      "api_key_env": "DEEPSEEK_API_KEY",
      "base_url": "https://api.deepseek.com/v1",
      "models": {
        "specialized_text": ["deepseek-v4-pro"]
      }
    }
  },
  "aliases": {
    "cover_image":  "image",
    "thumbnail":    "image",
    "voiceover":    "speech",
    "bgm":          "music",
    "video_clip":   "video",
    "poem_writer":  "specialized_text",
    "lyrics_writer":"specialized_text",
    "code_analyzer": "code_analysis"
  }
}
```

### 别名系统

`aliases` 让调用方按**用途**指定 Provider，而非按能力：

```python
# 不用别名 —— 调用方需要知道能力名
media.generate("image", prompt="...")

# 用别名 —— 调用方按用途指定
media.generate("cover_image", prompt="...", size="1024x1368")
media.generate("voiceover", text="口播文本...", voice_id="male-tech")
media.generate("bgm", prompt="ambient tech", duration=60)
media.generate("script_writer", system="你是一个...", user_prompt="写一段...")
media.generate("poem_writer", system="你是诗人...", user_prompt="写一首四言诗...")
```

配置里可以为不同用途指定不同 Provider，例如：
```json
"aliases": {
  "cover_image":  { "provider": "minimax", "model": "image-01" },
  "script_writer": { "provider": "deepseek", "model": "deepseek-v4-pro" },
  "voiceover":    { "provider": "minimax", "model": "speech-hd" }
}
```

### 使用示例

```python
# ── 文本任务：code agent 直接完成 ──
# 口播脚本、标题、文案、源码分析 → 全由 code agent 写，不走 MediaGenerator
script = """5天时间，854个Star，一个没有一行可执行代码的仓库..."""
# （这就是 code agent 刚才写的）

# ── 非文本任务：走 MediaGenerator ──
from media_generation import MediaGenerator
media = MediaGenerator()

# 生成封面图
result = await media.generate("cover_image",
    prompt="A bold sans-serif poster ...",
    size="1024x1368",
    aspect_ratio="3:4"
)  # → minimax image-01

# 生成口播配音
result = await media.generate("voiceover",
    text=script,
    voice_id="male-tech-01",
    speed=1.0
)  # → minimax speech-hd

# 生成 BGM
result = await media.generate("bgm",
    prompt="ambient electronic, subtle beat",
    duration=67,
    mood="calm"
)  # → minimax music-2.6

# 生成四言诗（只有这种特殊格式才调外部 Provider）
result = await media.generate("poem_writer",
    format="classical_poem",
    theme="AI Agent 架构之美",
    style="王维式田园诗",
    length="short"
)  # → minimax MiniMax-M*
```

**简单记忆：能用 markdown 写的 → code agent 写；需要像素/声波/视频帧的 → MediaGenerator。**

---

## 与视频 Pipeline 的集成

```
media_config.json  (一次配置)
       │
       ▼
┌──────────────────────────────────────────────┐
│          MediaGenerator (单例)                │
│                                              │
│  .generate("cover_image", ...)               │
│  .generate("voiceover", ...)                 │
│  .generate("bgm", ...)                       │
│  .generate("script_writer", ...)             │
│  .generate("poem_writer", ...)              │
│  .generate("video_clip", ...)                │
└──────┬───────┬───────┬───────┬───────────────┘
       │       │       │       │
       ▼       ▼       ▼       ▼
  Layer 0   Layer 3   Layer 4  (各层按需调用)
   封面       BGM      TTS
   脚本              封面
```

各层不直接调 `mmx` CLI 或 OpenAI SDK，只调 `MediaGenerator`。换 Provider 时只需改 `media_config.json`。

---

## 实现策略

### Provider 实现优先级

| Provider | 能力 | 实现方式 | 优先级 | 状态 |
|----------|------|---------|--------|------|
| MiniMax | 图片 / 语音 / 音乐 / 视频 | `mmx` CLI 包装 | P0 | ✅ 已实现 |
| MiniMax | 特殊文本（四言诗等） | `mmx chat` 包装 | P1 | ✅ 已实现 |
| DeepSeek | 特殊文本（四言诗等） | HTTP API (OpenAI 兼容) | P1 | ✅ 已实现 |
| OpenAI | 图片 / 语音 | HTTP API (OpenAI SDK) | P2 | ❌ 未实现 |

Provider 实现采用**最小接口**：不要求每个 Provider 实现所有能力。调用不支持的 capability 时抛 `UnsupportedCapabilityError`，上游做降级处理。

### 降级策略

```
请求: generate("bgm", ...)
  1. 尝试 music-2.6 → 成功 ✓

请求: generate("video_clip", ...)
  1. 尝试 MiniMax Hailuo → 额度用完
  2. 降级: 返回空 → 时间线里该 seg 改为纯图片展示

请求: generate("script_writer", ...)
  1. 尝试 deepseek → API 超时
  2. 降级: 尝试 minimax → 成功 ✓
```

降级规则在配置里定义：
```json
"aliases": {
  "script_writer": {
    "providers": [
      { "provider": "deepseek", "model": "deepseek-v4-pro" },
      { "provider": "minimax", "model": "MiniMax-M*" }
    ]
  }
}
```

---

## 目录结构（实际实现）

> ✅ = 已实现，⬜ = 未实现（预留）

```
media_generation/                    # 实际目录名用下划线 (Python 包规范)
├── skill.md                        # ✅ Agent 操作指南 (YAML frontmatter + 中文说明)
├── __init__.py                     # ✅ export MediaGenerator, GenerationResult
├── media_config.json               # ✅ Provider 配置 & 别名 & 降级规则
├── media_generator.py              # ✅ 主入口，路由 & 降级
├── providers/
│   ├── __init__.py                 # ✅
│   ├── base.py                     # ✅ BaseProvider ABC, GenerationResult (Pydantic)
│   └── minimax.py                  # ✅ mmx CLI 包装 (image/speech/music/video)
│   ├── openai.py                   # ⬜ OpenAI HTTP API (P2)
│   └── deepseek.py                 # ✅ DeepSeek HTTP API (P1 - specialized_text)
├── capabilities/
│   ├── __init__.py                 # ✅
│   ├── image.py                    # ✅ ImageRequest/ImageData/ImageResult (Pydantic)
│   ├── speech.py                   # ✅ SpeechRequest/SpeechResult/VoiceInfo (Pydantic)
│   ├── music.py                    # ✅ MusicRequest/InstrumentalRequest/MusicResult (Pydantic)
│   └── video.py                    # ✅ VideoRequest/ImageToVideoRequest/VideoResult (Pydantic)
│   ├── text.py                     # ✅ SpecializedText (P1 - 四言诗/歌词/对联 via mmx chat)
└── utils/
    ├── __init__.py                 # ✅
    ├── download.py                 # ✅ URL → 本地文件 (curl subprocess)
    ├── retry.py                    # ✅ 指数回退 + jitter
    └── format.py                   # ✅ 格式转换 (wav⇄mp3, png→jpg, webm→mp4, gif→mp4)

pyproject.toml                      # ✅ uv 包管理器，依赖 pydantic>=2.0
schemas/content.schema.json         # ✅ content.json JSON Schema (draft-07)
```

---

## 设计决策记录

### Q1: mmx CLI vs HTTP API？→ 已决策：CLI 实现

MiniMax Provider 用 `mmx` CLI 包装（`asyncio.create_subprocess_exec` + `--quiet` 模式）。
P0 不解析 `--output json`，只检查退出码 + 输出文件存在。
后续换 HTTP API 时 Provider 接口不变。

### Q2: 同步 vs 异步？→ 已决策：统一 async/await

全部接口统一 `async def`。视频生成额外包 `retry_with_backoff`（指数回退 + jitter），
其他能力不重试。

### Q3: 本地缓存？→ 已决策：P0 不做

P0 无缓存。P1 加 content-addressable 缓存（prompt hash → 结果文件路径）。

### Q4: 文本任务谁来做？→ 已决策：code agent 直接完成

口播脚本、标题、文案、源码分析 → code agent 不做 MediaGenerator。
MediaGenerator 只负责：图片、语音、音乐、视频。SpecializedText（四言诗等）P1 再加。
