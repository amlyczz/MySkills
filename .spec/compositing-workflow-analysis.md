# 实录素材合成流（Compositing Workflow）融合分析

> 基于 Gemini 的"包装合成引擎"思路 vs 当前项目
> 日期：2026-05-21
> 实施状态：P0 ✅ + P1 ✅ — P2 跳过（DeviceFrame/变速/Vision 属于未来增强）

---

## 一、核心理念对齐

Gemini 提出的"Remotion 从模拟器转变为智能包装合成引擎"与我们当前架构**高度吻合**：

| Gemini 概念 | 我们已有的实现 |
|------------|-------------|
| raw-screen-recording.mp4 | recorder.mjs 输出的 scroll_video / link_video / manual_video |
| 包装容器（GlowContainer） | MediaFull 布局——视频铺满画面 |
| 外围大字（叠加标题） | SceneBase Layer 3 — 半透明遮罩 + 文字布局 |
| 时间重映射（skip boring parts） | recorder.mjs 的 trim 逻辑（裁掉加载等待） + timeline.json 的 material_time_range |
| 虚拟摄像机运镜 | ❌ 缺失——当前无 PanAndZoom 能力 |

**结论：3/5 能力已具备基础，摄像机运镜和容器包装是核心增量。**

---

## 二、逐项分析

### 2.1 空间遮罩与设备投射 (Device Mockup) — 可行

当前 `MediaFull` 只是把视频放入 `<AbsoluteFill>`，无包装。可以新增 `GlowContainer` / `DeviceFrame` 两个 wrapper：

- **GlowContainer**：流光边框（4 色渐变）+ 圆角 + overflow-hidden。视频在其内部 object-cover。
- **DeviceFrame**：3D 设备外壳（手机/笔记本）+ 高光反射层。视频贴图到屏幕区域。

**改造点**：
- 新增 `wrappers/GlowContainer.tsx` — ~30 行 CSS
- `LayoutProps` 新增 `wrapperType?: "glow" | "device-frame"`
- `MediaFull` 用 wrapper 包裹 `<Video>`

### 2.2 时间轴重映射 (Time Remapping) — 已部分具备

当前 `recorder.mjs` 已做视频裁剪（裁掉加载等待）。`timeline.json` 的 `material_time_range` 已定义 `{start, end}` 裁剪范围。

**增量**：
- `timeline.json` `material_time_range` 新增 `speed` 字段（`1.0 = 正常`, `2.0 = 2倍速`, `0.5 = 慢放`）
- Remotion `<Video>` 组件原生不支持变速。曲线救国方案：用 ffmpeg 在 `allocate.py` 里对素材预先变速处理。

### 2.3 三维空间运镜 (Camera Tracking) — 核心增量

这是最大的新增能力。当前场景是静态的——元素入场后停在那。需要新增：

**概念**：`CameraAction` — 一个场景内的摄像机空间运动描述。

```ts
interface CameraAction {
  type: "pan-and-zoom";
  targetScale: number;     // 目标缩放倍率（1.0 → 2.5）
  focusPoint: { x: number; y: number }; // 焦点坐标（像素或百分比）
  triggerFrame: number;    // 在第几帧触发运镜
}
```

**实现方案**：复用我们的 `useLifecycle` / spring 体系，新增 `VirtualCamera` 组件包裹内容层。

```tsx
// VirtualCamera wraps content with transform from CameraAction
<VirtualCamera action={cameraAction} sceneFrames={sceneFrames}>
  <GlowContainer>
    <Video src={mediaUrl} />
  </GlowContainer>
</VirtualCamera>
```

`VirtualCamera` 内部计算：当前帧 → spring progress → interpolate scale + translate，应用到 `transform: scale(s) translate(x, y)`。

**与现有系统融合**：
- `CameraAction` 放在 `timeline.json` 的 `segments[].camera` 字段
- `timeline_composer.py` 不为 camera 生成配置（只有 video 场景才需要），由 LLM 在 content.json 阶段直接写入
- `allocate.py` 在 build_video_config 时将 cameraAction 写入 SceneConfig

### 2.4 中心视频 + 外围标题布局 (CenterFocusVideo) — 可行

新增布局类型 `center-focus-video`：

```
┌─────────────────────────────────┐
│      "一键构建应用" (标题)       │  ← 外围大字，不受摄像机影响
│                                 │
│   ┌───────────────────────┐     │
│   │  ╭─── GlowContainer ─╮│     │  ← VirtualCamera 包裹
│   │  │   Video (录屏)    ││     │     可缩放/平移
│   │  ╰───────────────────╯│     │
│   └───────────────────────┘     │
│                                 │
└─────────────────────────────────┘
```

与现有 `MediaFull` 的区别：MediaFull 是纯视频，CenterFocusVideo 是视频+叠加标题+可运镜。

---

## 三、JSON Schema 建议扩展

### 3.1 timeline.json segments[].camera（新增）

```json
{
  "segments": [{
    "id": "seg_003",
    "type": "showcase",
    "primary_material": "mat_scroll_001",
    "camera": {
      "action": "pan-and-zoom",
      "targetScale": 2.5,
      "focusPoint": { "x": 0.3, "y": 0.5 },
      "triggerFrame": 90
    }
  }]
}
```

### 3.2 content.json（不变，由 LLM 直接写入）

LLM 在生成 content.json 时，如果选择了 `performance-launch` 结构，`showcase` 场景可以携带 cameraAction：

```json
{
  "sceneConfigs": {
    "showcase": {
      "content": { "headline": "一键构建应用" },
      "wrapperType": "glow",
      "cameraAction": { "type": "pan-and-zoom", "targetScale": 2.5, "focusPoint": { "x": 0.3, "y": 0.5 }, "triggerFrame": 90 }
    }
  }
}
```

---

## 四、实施计划

### P0 — 核心合成能力 ✅

| # | 项目 | 文件 | 状态 |
|---|------|------|------|
| 1 | GlowContainer wrapper | `wrappers/GlowContainer.tsx` | ✅ |
| 2 | VirtualCamera 组件（PanAndZoom） | `components/VirtualCamera.tsx` | ✅ |
| 3 | CenterFocusVideo 布局 | `layouts/CenterFocusVideo.tsx` | ✅ |

### P1 — Schema + 管线集成 ✅

| # | 项目 | 状态 |
|---|------|------|
| 4 | `camera` 字段入 timeline.schema.json | ✅ |
| 5 | `wrapperType` / `cameraAction` 入 SceneConfig / LayoutProps | ✅ |
| 6 | VideoComposer + ShowcaseScene 透传 camera/wrapper | ✅ |
| 7 | allocate.py — cameraAction + wrapperType 写入 SceneConfig | ✅ |

### P2 — 高级增强（可选）

| # | 项目 | 说明 |
|---|------|------|
| 8 | DeviceFrame 3D 设备外壳 | 需要 3D CSS transform，工作量较大 |
| 9 | 时间变速（speed remapping） | ffmpeg 预处理，非 Remotion 范畴 |
| 10 | Vision 模型自动提取坐标 | future：分析视频帧 → 识别按钮/光标 → 填充 focusPoint |

---

## 五、与现有系统的融合

所有新增组件为增量，不影响现有模板：

```
video-renderer/remotion/src/
├── layouts/
│   ├── MediaFull.tsx          ← 不变
│   ├── CenterFocusVideo.tsx   ← 新增
│   └── ...
├── components/
│   ├── ChapterProgressBar.tsx ← 不变
│   ├── VirtualCamera.tsx      ← 新增
│   └── ...
├── wrappers/                  ← 新目录
│   └── GlowContainer.tsx      ← 新增
├── scenes/
│   └── index.tsx              ← 新增 center-focus-video 场景
└── types.ts                   ← 新增 CameraAction, wrapperType
```

**现有 5 种结构、12 套主题、7 种布局、全部动效保持不变。** Compositing Workflow 是对 show-case 场景的升维，不是替代。
