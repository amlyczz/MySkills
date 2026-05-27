# Spec: TTS Provider 抽象 + MiMo TTS 接入

**日期**: 2026-05-27
**状态**: Draft

## 问题陈述

当前 `VoiceoverGenerator` 唯一实现是 `MediaGenerator`，通过子进程调用外部 `media_generator` 包（里面走 MiniMax/Omnivoice）。问题：
1. 所有 TTS 提供商耦合在一个子进程调用里，无法单独切换
2. 无法直接调用云 TTS API（如 MiMo TTS）
3. 失败时写 mock 占位数据，隐蔽问题

需要：
- 在 video-pipeline **infrastructure 层**，为每个 TTS 提供商创建独立的 `VoiceoverGenerator` 实现
- 组合模式实现优先级链，自动降级
- 新增 MiMo TTS 作为首选

## 架构分层

```
domain/post_producer/interfaces.py
    VoiceoverGenerator (接口)
         ▲
         │ implements
         │
infrastructure/post_producer/tts/
  ├── mimo_tts.py           ← 首选：小米 MiMo TTS (OpenAI SDK 直接调用)
  ├── minimax_tts.py        ← 备选 1：MiniMax speech-hd (mmx CLI)
  ├── omnivoice_tts.py      ← 备选 2：Omnivoice localhost:3900 (HTTP)
  └── chain.py              ← 组合：TTSChain 按优先级依次尝试
         ▲
         │ assembles & injects
         │
presentation/websocket/task_streamer.py
```

## TTS 提供商清单

| 优先级 | 实现文件 | Provider | 调用方式 | 音色 | 说明 |
|---|---|---|---|---|---|
| 1 | `mimo_tts.py` | 小米 MiMo | OpenAI SDK 直调 | `苏打`(男) | 风格控制强，限时免费 |
| 2 | `minimax_tts.py` | MiniMax | `mmx speech synthesize` CLI | `speech-hd` | 稳定可靠 |
| 3 | `omnivoice_tts.py` | Omnivoice | HTTP localhost:3900 | `omnivoice-3` | 本地部署 |

## MiMo TTS API 要点

| 项 | 值 |
|---|---|
| Base URL | `https://api.xiaomimimo.com/v1` |
| Auth Header | `api-key: $MIMO_API_KEY` |
| Model | `mimo-v2.5-tts`（预置音色）|
| 协议 | OpenAI Chat Completions 兼容 |
| 输入 | `user` = 风格指令，`assistant` = 待合成文本 |
| 输出 | `response.choices[0].message.audio.data` (base64 WAV) |
| 音频 | WAV 24kHz mono，需 ffmpeg 转 mp3 |
| 计费 | 限时免费 |

Key: `tp-cxyqxirmdbgr0pj2qpn1jbax7skm3v40splt28hii8dfndsb`

## 设计方案

### 1. VoiceoverGenerator 接口增强

`domain/post_producer/interfaces.py`：

```python
class VoiceoverGenerator(ABC):
    @abstractmethod
    async def generate_voiceover(
        self,
        text: str,
        output_path: str,
        voice_id: str = "default",
        style: str | None = None,  # 新增：自然语言风格指令
    ) -> str:
```

### 2. MimoTTSVoiceoverGenerator

`infrastructure/post_producer/tts/mimo_tts.py`：

```python
class MimoTTSVoiceoverGenerator(VoiceoverGenerator):
    def __init__(self, api_key: str, voice: str = "苏打"):
        self.client = OpenAI(api_key=api_key, base_url="https://api.xiaomimimo.com/v1")
        self.voice = voice

    async def generate_voiceover(self, text, output_path, voice_id="default", style=None):
        # user message: style 或默认 "用沉稳专业的男声朗读"
        # assistant message: text
        # 调用 client.chat.completions.create(model="mimo-v2.5-tts", ...)
        # base64 解码 → wav → ffmpeg 转 mp3（如需要）
```

### 3. MinimaxTTSVoiceoverGenerator

`infrastructure/post_producer/tts/minimax_tts.py`：

```python
class MinimaxTTSVoiceoverGenerator(VoiceoverGenerator):
    """调用 mmx CLI 的 MiniMax speech-hd。"""
    async def generate_voiceover(self, text, output_path, voice_id="male-qn-jingying", style=None):
        cmd = ["mmx", "speech", "synthesize",
               "--text", text, "--voice", voice_id,
               "--speed", "1.0", "--out", output_path, "--quiet"]
        # asyncio.create_subprocess_exec
```

### 4. OmnivoiceTTSVoiceoverGenerator

`infrastructure/post_producer/tts/omnivoice_tts.py`：

```python
class OmnivoiceTTSVoiceoverGenerator(VoiceoverGenerator):
    """调用本地 Omnivoice HTTP API (localhost:3900)。"""
    def __init__(self, base_url: str = "http://localhost:3900"):
        self.base_url = base_url

    async def generate_voiceover(self, text, output_path, voice_id="default", style=None):
        # httpx AsyncClient POST to base_url/tts or similar
```

### 5. TTSChain 组合

`infrastructure/post_producer/tts/chain.py`：

```python
class TTSChain(VoiceoverGenerator):
    """按优先级依次尝试多个 TTS 提供商，全部失败才抛异常。"""

    def __init__(self, providers: list[VoiceoverGenerator]):
        self.providers = providers

    async def generate_voiceover(self, text, output_path, voice_id="default", style=None):
        last_error = None
        for provider in self.providers:
            try:
                return await provider.generate_voiceover(text, output_path, voice_id, style)
            except Exception as e:
                logger.warning("TTS %s failed: %s, trying next", type(provider).__name__, e)
                last_error = e
        raise RuntimeError(f"All TTS providers failed. Last error: {last_error}")
```

### 6. 注入点

`presentation/websocket/task_streamer.py`：

```python
from ...infrastructure.post_producer.tts.mimo_tts import MimoTTSVoiceoverGenerator
from ...infrastructure.post_producer.tts.minimax_tts import MinimaxTTSVoiceoverGenerator
from ...infrastructure.post_producer.tts.omnivoice_tts import OmnivoiceTTSVoiceoverGenerator
from ...infrastructure.post_producer.tts.chain import TTSChain

tts_chain = TTSChain(providers=[
    MimoTTSVoiceoverGenerator(api_key=settings.mimo_api_key, voice=settings.mimo_tts_voice),
    MinimaxTTSVoiceoverGenerator(),
    OmnivoiceTTSVoiceoverGenerator(),
])
# voiceover_gen=tts_chain
```

### 7. BGM 处理

BGM 不做拆分，保留 `MediaGenerator` 的 BGM 子进程调用：
```python
bgm_gen = MediaGenerator()  # 只用于 BGM
```

### 8. 配置

`.env` 新增：
```
MIMO_API_KEY=tp-cxyqxirmdbgr0pj2qpn1jbax7skm3v40splt28hii8dfndsb
MIMO_TTS_VOICE=苏打
```

`app_config.py` 新增：
```python
mimo_api_key: str = Field(default_factory=lambda: os.getenv("MIMO_API_KEY", ""))
mimo_tts_voice: str = Field(default_factory=lambda: os.getenv("MIMO_TTS_VOICE", "苏打"))
```

## 文件变更清单

| 文件 | 操作 |
|---|---|
| `domain/post_producer/interfaces.py` | 修改：VoiceoverGenerator 增加 `style` 参数 |
| `infrastructure/post_producer/tts/__init__.py` | **新增** |
| `infrastructure/post_producer/tts/mimo_tts.py` | **新增**：MiMo TTS |
| `infrastructure/post_producer/tts/minimax_tts.py` | **新增**：MiniMax TTS (mmx CLI) |
| `infrastructure/post_producer/tts/omnivoice_tts.py` | **新增**：Omnivoice TTS (HTTP) |
| `infrastructure/post_producer/tts/chain.py` | **新增**：TTSChain 组合 |
| `infrastructure/post_producer/media_generator.py` | 保留：仅用于 BGM |
| `infrastructure/config/app_config.py` | 修改：新增 mimo 配置 |
| `presentation/websocket/task_streamer.py` | 修改：组装 TTSChain |
| `.env` / `.env.example` | 修改：新增 MIMO 配置 |

## 验收标准

1. 每个 TTS provider 单测（mock 外部调用）
2. TTSChain 测试：provider1 失败 → 自动尝试 provider2
3. 端到端：pipeline audio_design 节点生成可播放 .mp3
4. MiMo key 无效时自动降级到 MiniMax → Omnivoice，不中断流程
