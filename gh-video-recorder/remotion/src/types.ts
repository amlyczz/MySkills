/**
 * types.ts — 视频模板系统的所有共享类型定义。
 *
 * 五层架构：结构(L4) / 样式(L3) / 布局(L2) / 动效(L1) / 听觉(横切层)
 * 匹配引擎(L5) 使用这些类型生成 VideoConfig。
 */

import { BgType } from "./backgrounds";

// ═══════════════════════════════════════════════════════════════
//  L4 结构模板 — 视频级
// ═══════════════════════════════════════════════════════════════

/** 场景类型，决定可用的布局选项和内容槽位 */
export type SceneType =
  | "hook" // 黄金三秒：视觉冲击 + 核心信息
  | "problem" // 痛点共鸣
  | "solution" // 方案亮相
  | "feature" // 功能亮点（可多个）
  | "proof" // 数据证明 / 用户评价
  | "cta" // 行动呼吁（即 outro）
  | "transition" // 场景间过渡
  | "showcase"; // 素材展示（视频/图片/滚动录屏）

/** 素材类型 */
export type AssetType = "video" | "image" | "scroll_recording";

/** 内容槽位 */
export interface ContentSlot {
  name: string; // 槽位名：title / subtitle / body / points / url / stats
  type: "text" | "media";
  required: boolean;
  maxLines?: number; // 文本最大行数（用于布局计算）
}

/** 场景定义 */
export interface SceneDef {
  id: string;
  type: SceneType;
  durationSeconds: number;
  contentSlots: ContentSlot[];
  requiredAssets?: AssetType[];
}

/** 结构模板 */
export interface StructureTemplate {
  id: string;
  name: string;
  scenes: SceneDef[];
}

// ═══════════════════════════════════════════════════════════════
//  L3 样式模板 — 视频级
// ═══════════════════════════════════════════════════════════════

export type StyleFamily =
  | "tech"
  | "business"
  | "creative"
  | "minimal"
  | "playful";

/** 样式模板 */
export interface StyleTemplate {
  id: string;
  family: StyleFamily;
  displayName: string;
  mood: string[];

  // 色彩方案 (60-30-10)
  colors: {
    background: string; // 60% 主背景（渐变或纯色）
    surface: string; // 30% 辅面色
    primary: string; // 核心交互色
    accent: string; // 10% 强调色
    text: string; // 正文色
    textMuted: string; // 辅助文字色
    divider: string; // 分割线色
  };

  // 字体方案
  typography: {
    fontFamily: string;
    titleWeight: number;
    bodyWeight: number;
    titleLetterSpacing: number;
    titleSize: number;
  };

  // 装饰系统
  decoration: {
    vignette: boolean;
    pattern?: "dot-grid" | "noise" | "grid" | null;
    borderRadius: number;
    ruleStyle: "solid" | "dashed" | "double";
    bulletChar: string;
    textTransform?: "uppercase" | "none";
  };

  // 默认背景动效
  defaultBgType: BgType;

  // 特殊效果
  effects?: {
    glowColor?: string;
    shadowPreset?: "neon" | "warm" | "default";
    italicForSubtitle?: boolean;
  };
}

/** 样式元数据（用于匹配推荐） */
export interface StyleMeta {
  id: string;
  displayName: string;
  family: StyleFamily;
  mood: (
    | "dark"
    | "light"
    | "warm"
    | "cold"
    | "tech"
    | "creative"
    | "minimal"
    | "playful"
  )[];
  bestFor: string[];
  defaultBgType: BgType;
  preview: { bg: string; text: string; accent: string };
}

/** 从 StyleTemplate 派生的 Design Tokens */
export interface StyleTokens {
  bgBaseColor: string;
  overlayBg: string;
  titleShadow: string;
  bodyColor: string;
  mutedColor: string;
  underlineBg: string;
  bulletColor: string;
  titleFont: string;
  titleTransform: "uppercase" | "none";
}

// ═══════════════════════════════════════════════════════════════
//  L2 布局模板 — 场景级
// ═══════════════════════════════════════════════════════════════

export type LayoutType =
  | "hero-center" // 居中单列
  | "split-left-text" // 左侧文案 1/3 + 右侧素材/留空 2/3
  | "split-right-text" // 右侧文案 + 左侧素材
  | "full-screen-text" // 全屏文字，极简
  | "card-grid" // 2×2 或 3×1 卡片网格
  | "quote-style" // 引用式：大引号 + 文字
  | "stat-highlight" // 大数字 + 说明文字
  | "media-full" // 纯素材展示（视频/图片铺满）
  | "code-display"; // 代码展示（终端风格 + 语法高亮）

/** 布局组件统一 props */
export interface LayoutProps {
  title?: string;
  subtitle?: string;
  body?: string;
  points?: string[];
  mediaUrl?: string;
  stats?: string;

  /** CodeDisplay: 代码文本 */
  code?: string;
  /** CodeDisplay: 编程语言 */
  language?: string;
  /** CodeDisplay: 高亮行号数组 */
  highlightLines?: number[];
  /** CodeDisplay: 是否显示行号 */
  showLineNumbers?: boolean;
  /** CodeDisplay: 入场动画类型 */
  codeAnimation?: "type" | "fade" | "scroll";

  style: StyleTokens;
  theme: StyleTemplate;
  /** 元素角色 → 动效类型 ID 的映射 */
  motionMap: Record<string, MotionType>;

  showUnderline?: boolean;
  showBullet?: boolean;
}

// ═══════════════════════════════════════════════════════════════
//  L1 动效模板 — 元素级
// ═══════════════════════════════════════════════════════════════

export type MotionType =
  // 入场动效
  | "spring-slide-up"
  | "spring-slide-left"
  | "arc-entrance"
  | "scale-fade"
  | "typewriter"
  | "reveal-mask"
  | "bounce-in"
  | "blur-focus"
  // 退场动效
  | "fade-out"
  | "slide-out-left"
  | "scale-down-out"
  | "blur-out"
  // 驻留动效
  | "subtle-float"
  | "glow-pulse"
  | "none";

export interface SpringConfig {
  mass: number;
  damping: number;
  stiffness: number;
}

export type EnterPosition =
  | { type: "translate"; x: number; y: number }
  | { type: "scale"; from: number }
  | { type: "arc"; fromX: number; fromY: number }
  | { type: "mask"; direction: "left" | "right" };

/** 动效模板 */
export interface MotionPreset {
  id: string;
  name: string;

  entrance: {
    springConfig: SpringConfig;
    delayFrames: number;
    durationFrames: number;
    enterFrom: EnterPosition;
  };

  idle?: {
    type: "float" | "glow" | "none";
    amplitude?: number;
    frequency?: number;
  };

  exit?: {
    type: "fade-out" | "slide-out" | "scale-down";
    durationFrames: number;
  };

  /** 关联音效（预留槽位，Phase 3 实现） */
  sfx?: SfxBinding;
}

/** 音效绑定（预留） */
export interface SfxBinding {
  src: string;
  delay: number;
  volume: number;
}

// ═══════════════════════════════════════════════════════════════
//  A  听觉系统 — 横切层（预留槽位）
// ═══════════════════════════════════════════════════════════════

export type BgmMood =
  | "epic"
  | "upbeat"
  | "chill"
  | "tech"
  | "cinematic"
  | "corporate"
  | "playful";

export interface VolumePoint {
  time: number;
  volume: number;
}

/** BGM 背景音乐（预留） */
export interface BgmTrack {
  id: string;
  src: string;
  bpm?: number;
  mood: BgmMood;
  volumeCurve?: VolumePoint[];
}

/** 场景级配音（预留） */
export interface VoiceoverTrack {
  sceneId: string;
  src: string;
  text: string;
  durationSeconds: number;
}

/** 元素级配音段落（预留） */
export interface VoiceoverSegment {
  sceneId: string;
  elementRole: string;
  src: string;
  text: string;
  durationSeconds: number;
  startOffsetSeconds: number;
}

/** 音频配置 */
export interface AudioConfig {
  bgm?: BgmTrack;
  sfxEnabled: boolean;
  voiceover: VoiceoverSegment[];
  voiceoverEnabled: boolean;
}

// ═══════════════════════════════════════════════════════════════
//  匹配引擎输入/输出
// ═══════════════════════════════════════════════════════════════

export interface AssetInfo {
  path: string;
  duration?: number;
  label?: string;
}

/** 匹配引擎输入 */
export interface MatchingInput {
  title: string;
  tagline?: string;
  points: string[];
  summary?: string;
  url: string;
  stats?: string;

  extractedVideos: AssetInfo[];
  images: AssetInfo[];
  scrollVideos: AssetInfo[];
  linkVideos: AssetInfo[];

  language?: string;
  topics?: string[];
  isDemoHeavy?: boolean;

  totalDuration: number;
}

/** 场景配置 */
export interface SceneConfig {
  layoutId: LayoutType;
  motionMap: Record<string, MotionType>;
  content: Record<string, string | string[]>;
}

/** 完整视频配置 — 匹配引擎输出 */
export interface VideoConfig {
  structureId: string;
  styleId: string;
  bgType: BgType;
  sceneConfigs: Record<string, SceneConfig>;
  audio: AudioConfig;
}

// ═══════════════════════════════════════════════════════════════
//  章节进度条
// ═══════════════════════════════════════════════════════════════

export type ProgressBarStyle =
  | "minimal-dots"
  | "labeled-bar"
  | "gradient-fill"
  | "segment-blocks"
  | "timeline-ticks";

export interface Chapter {
  label: string;
  time: number;
}
