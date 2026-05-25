---
name: post-producer
description: >
  后期合成。音频混音（voiceover + BGM sidechain ducking + SFX 放置）、
  字幕烧录（SRT → ffmpeg subtitles）、素材完整性验证。
triggers:
  - 合成最终视频
  - 混音音频
  - 烧录字幕
  - 验证素材完整性
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Post-Producer — 后期合成 Skill

你是一个视频后期制作助手。负责音频混音、字幕烧录、素材验证。

**原则**：验证检查项不写在此，去读源码。

---

## 目录结构

```
post-producer/
├── skill.md              ← 本文件
├── schema/
│   └── models.py         ← TimelineModel、MixAudioRequest 等 Pydantic 模型
└── scripts/
    ├── audio_mixer.py         ← 音频混音 + final composition
    ├── gen_srt.py             ← 从 video_config.json voiceover entries 生成 SRT（等比例缩放）
    ├── gen_voiceover_timed.py ← Per-segment TTS + 静默间隙拼接，场景对齐 voiceover 生成
    └── verify_output.py       ← 素材完整性检查
```

---

## 输出目录约定

所有管线产物按信息源分类统一输出到带分钟精度的目录：

```
output/{source_category}/{YYYY-MM-DD-HHMM}/{repo_name}/
  ├── video.mp4             ← 上游 video-renderer 产物
  ├── voiceover.mp3          ← 上游 media-generator 产物
  ├── bgm.mp3                ← 上游 media-generator 产物
  ├── timeline.json          ← 上游 timeline-composer 产物
  ├── timeline.srt           ← 上游 timeline-composer 产物
  ├── timeline.bgm_curve.json← 上游 timeline-composer 产物
  ├── video_config.json      ← 上游 timeline-composer 产物
  ├── final.mp4              ← 本层混音输出
  └── final_subtitled.mp4    ← 本层字幕烧录输出
```

---

## 一、素材完整性验证（合成前推荐）

```bash
cd post-producer/scripts
python3 verify_output.py "<output_dir>" 180
```

完整的检查项列表在 `verify_output.py` 的运行时输出中。每项有级别（ERROR / WARNING）和具体检查逻辑。去读该脚本了解每项检查的触发条件。

---

## 二、SRT 生成 + 音频混音 + 最终合成

### 2.1 语音 + 字幕生成

先按策略 A（推荐）或策略 B（备选）—— 见第三节的 `gen_voiceover_timed.py` / `gen_srt.py` 用法。

### 2.2 音频混音 + 烧录字幕

```bash
cd post-producer/scripts
python3 audio_mixer.py video.mp4 voiceover.mp3 bgm.mp3 timeline.json \
  --output final.mp4 \
  --sfx-dir sfx/ \
  --bgm-offset 0.5 \
  --bgm-tail 1.0 \
  --bgm-curve timeline.bgm_curve.json \
  --srt timeline.srt
```

**处理流程**：
1. Voiceover: loudnorm 标准化到 -16 LUFS + `apad=pad_dur=` 填充到视频全长（不能用 `apad=whole_len=`，loudnorm 后 duration 会变导致失效）
2. BGM: 按 segment audio 编排生成音量包络 + fade in/out
3. Sidechain ducking: voiceover 激活时 BGM 自动衰减
4. SFX: 按 timeline 时间点放置，支持 repeat
5. Mux: video + mixed audio → final.mp4（不能加 `-shortest`，会截断到最短流）
6. 字幕烧录（需 ffmpeg-full）：`subtitles` 过滤器

**已知坑**：
- `loudnorm` → `apad=whole_len=N` 不工作。用 `apad=pad_dur=N - input_dur` 代替
- `-shortest` 会截断到最短流的时长（~82s），去掉后视频流主导时长
- `sidechaincompress` 输出时长 = 最短输入时长（非 first 输入时长，与 docs 不一致）

---

## 三、Voiceover 生成 + SRT 字幕生成（混音前必须执行）

有两种策略，按需选择：

### 策略 A：Per-segment TTS + 场景对齐（推荐）

使用 `gen_voiceover_timed.py` 为每段 voiceover 单独 TTS 生成，在段间插入静默间隙对齐场景视频位置。

```bash
cd post-producer/scripts
python3 gen_voiceover_timed.py <video_config.json> \
  --output-dir <OUTPUT_DIR> \
  --voice-id "Chinese (Mandarin)_Male_Announcer" \
  --pitch 3
```

输出：
- `$OUTPUT_DIR/voiceover.mp3`（带间隙对齐场景）
- `$OUTPUT_DIR/voiceover_timing.json`（每段的实际时间戳）

SRT 从 `voiceover_timing.json` 生成（使用连续累计时间，无缩放）：

```bash
python3 -c "
import json
from datetime import timedelta
def fmt_time(t):
    td = timedelta(seconds=t)
    h = int(td.total_seconds()) // 3600
    m = (int(td.total_seconds()) % 3600) // 60
    s = int(td.total_seconds()) % 60
    ms = int(round((t - int(t)) * 1000))
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'
with open('$OUTPUT_DIR/voiceover_timing.json') as f:
    timing = json.load(f)
srt = []
for i, t in enumerate(timing):
    srt.append(f\"\"\"{i + 1}
{fmt_time(t['start'])} --> {fmt_time(t['end'])}
{t['text']}
\"\"\")
with open('$OUTPUT_DIR/timeline.srt', 'w') as f:
    f.write('\n'.join(srt))
"
```

### 策略 B：连续 TTS + 等比例缩放

使用单次连续 TTS 生成，通过 `gen_srt.py` 用实际 voiceover 时长等比例缩放字幕时间。

```bash
cd post-producer/scripts
python3 gen_srt.py <video_config.json> <timeline.srt> --voiceover <voiceover.mp3>
```

**约束**：
- SRT 文件路径传递给 `audio_mixer.py --srt` 做字幕烧录
- 策略 A 更精确（段级对齐），策略 B 更简单但可能仍有偏移

## 四、字幕烧录

字幕烧录需要 ffmpeg 的 `subtitles` 过滤器（libass）。macOS 系统自带 ffmpeg 通常不包含，需使用 `ffmpeg-full`。audio_mixer.py 会自动检测可用的 ffmpeg。

```bash
# 烧录字幕（audio_mixer.py --srt 会自动调用）
python3 audio_mixer.py ... --srt timeline.srt

# 也可手动烧录（使用 ffmpeg-full）
/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg -y \
  -i final.mp4 \
  -vf "subtitles=timeline.srt" \
  -c:v libx264 -preset fast -crf 23 \
  -c:a copy \
  final_subtitled.mp4
```
