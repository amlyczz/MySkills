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
    ├── audio_mixer.py    ← 音频混音 + final composition
    └── verify_output.py  ← 素材完整性检查
```

---

## 一、素材完整性验证（合成前推荐）

```bash
cd post-producer/scripts
python3 verify_output.py "<output_dir>" 180
```

完整的检查项列表在 `verify_output.py` 的运行时输出中。每项有级别（ERROR / WARNING）和具体检查逻辑。去读该脚本了解每项检查的触发条件。

---

## 二、音频混音 + 最终合成

```bash
cd post-producer/scripts
python3 audio_mixer.py video.mp4 voiceover.mp3 bgm.mp3 timeline.json \
  --output final.mp4 \
  --sfx-dir sfx/ \
  --bgm-offset 0.5 \
  --bgm-tail 1.0
```

**处理流程**：
1. Voiceover: loudnorm 标准化到 -16 LUFS
2. BGM: 按 segment audio 编排生成音量包络 + fade in/out
3. Sidechain ducking: voiceover 激活时 BGM 自动衰减
4. SFX: 按 timeline 时间点放置，支持 repeat
5. Mux: video + mixed audio → final.mp4

---

## 三、ffmpeg concat 合成（可选）

如果只需要简单拼接，在 output 目录执行：

```bash
ffmpeg -f concat -safe 0 -i concat_list.txt \
  -c:v libx264 -preset fast -pix_fmt yuv420p overview.mp4
```
