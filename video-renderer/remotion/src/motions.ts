/**
 * motions.ts — 动效模板库。
 *
 * 定义 MotionPreset 预设，封装 spring 参数和入场方向。
 * 每个动效模板可绑定 SFX（预留）。
 */
import { MotionPreset, MotionType } from "./types";
import { sfxLibrary } from "./audio/sfxLibrary";

export type { MotionType };

/** 高弹性 UI 卡片弹出 — 用于 DeviceFrame 开盖、Pills 弹射 */
export const SPRING_ELASTIC_UI = { mass: 0.6, damping: 12, stiffness: 120 } as const;

/** 柔和数据生长 — 用于 AnimatedBarChart */
export const SPRING_DATA_GROW = { mass: 0.8, damping: 14, stiffness: 100 } as const;

export const motionPresets: Record<MotionType, MotionPreset> = {
  // ── 入场动效 ──
  "spring-slide-up": {
    id: "spring-slide-up",
    name: "弹性上滑",
    entrance: {
      springConfig: { mass: 0.8, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 40,
      enterFrom: { type: "translate", x: 0, y: 60 },
    },
    idle: { type: "float", amplitude: 3, frequency: 0.015, phaseOffset: 0 },
    exit: { type: "fade-out", durationFrames: 15 },
  },
  "spring-slide-left": {
    id: "spring-slide-left",
    name: "弹性左滑",
    entrance: {
      springConfig: { mass: 0.8, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 40,
      enterFrom: { type: "translate", x: 60, y: 0 },
    },
    idle: { type: "float", amplitude: 3, frequency: 0.015 },
    exit: { type: "slide-out", direction: "left", durationFrames: 15 },
  },
  "arc-entrance": {
    id: "arc-entrance",
    name: "弧线入场",
    entrance: {
      springConfig: { mass: 1.0, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 55,
      enterFrom: { type: "arc", fromX: 40, fromY: 60 },
    },
    idle: { type: "float", amplitude: 4, frequency: 0.012 },
    exit: { type: "blur-out", durationFrames: 15 },
  },
  "scale-fade": {
    id: "scale-fade",
    name: "缩放淡入",
    entrance: {
      springConfig: { mass: 0.6, damping: 20, stiffness: 100 },
      delayFrames: 0,
      durationFrames: 30,
      enterFrom: { type: "scale", from: 0.85 },
    },
    idle: { type: "breathe", amplitude: 2, frequency: 0.02 },
    exit: { type: "scale-down", durationFrames: 12 },
  },
  typewriter: {
    id: "typewriter",
    name: "打字机",
    entrance: {
      springConfig: { mass: 1.0, damping: 100, stiffness: 200 },
      delayFrames: 0,
      durationFrames: 60,
      enterFrom: { type: "translate", x: 0, y: 0 },
    },
    idle: { type: "none" },
    exit: { type: "fade-out", durationFrames: 10 },
  },
  "reveal-mask": {
    id: "reveal-mask",
    name: "遮罩揭示",
    entrance: {
      springConfig: { mass: 0.8, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 35,
      enterFrom: { type: "mask", direction: "left" },
    },
    idle: { type: "none" },
    exit: { type: "slide-out", direction: "right", durationFrames: 15 },
  },
  "bounce-in": {
    id: "bounce-in",
    name: "弹跳入场",
    entrance: {
      springConfig: { mass: 0.5, damping: 12, stiffness: 100 },
      delayFrames: 0,
      durationFrames: 45,
      enterFrom: { type: "translate", x: 0, y: 80 },
    },
    idle: { type: "breathe", amplitude: 2, frequency: 0.02 },
    exit: { type: "scale-down", durationFrames: 12 },
  },
  "blur-focus": {
    id: "blur-focus",
    name: "模糊聚焦",
    entrance: {
      springConfig: { mass: 0.8, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 30,
      enterFrom: { type: "scale", from: 1.05 },
    },
    idle: { type: "glow", glowIntensity: 0.8, frequency: 0.015 },
    exit: { type: "blur-out", durationFrames: 15 },
  },

  // ── 退场动效 ──
  "fade-out": {
    id: "fade-out",
    name: "淡出",
    entrance: {
      springConfig: { mass: 1.0, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 1,
      enterFrom: { type: "translate", x: 0, y: 0 },
    },
    exit: { type: "fade-out", durationFrames: 20 },
  },
  "slide-out-left": {
    id: "slide-out-left",
    name: "左滑退场",
    entrance: {
      springConfig: { mass: 1.0, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 1,
      enterFrom: { type: "translate", x: 0, y: 0 },
    },
    exit: { type: "slide-out", direction: "left", durationFrames: 20 },
  },
  "scale-down-out": {
    id: "scale-down-out",
    name: "缩小退场",
    entrance: {
      springConfig: { mass: 1.0, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 1,
      enterFrom: { type: "translate", x: 0, y: 0 },
    },
    exit: { type: "scale-down", durationFrames: 20 },
  },
  "blur-out": {
    id: "blur-out",
    name: "模糊退场",
    entrance: {
      springConfig: { mass: 1.0, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 1,
      enterFrom: { type: "translate", x: 0, y: 0 },
    },
    exit: { type: "blur-out", durationFrames: 15 },
  },

  // ── 驻留动效 ──
  "subtle-float": {
    id: "subtle-float",
    name: "微弱漂浮",
    entrance: {
      springConfig: { mass: 1.0, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 1,
      enterFrom: { type: "translate", x: 0, y: 0 },
    },
    idle: { type: "float", amplitude: 3, frequency: 0.02 },
  },
  "glow-pulse": {
    id: "glow-pulse",
    name: "光晕脉冲",
    entrance: {
      springConfig: { mass: 1.0, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 1,
      enterFrom: { type: "translate", x: 0, y: 0 },
    },
    idle: { type: "glow", glowIntensity: 0.3, frequency: 0.03 },
  },
  // ── 弹性动效 (v3) — 对标 Cohere 发布视频 ──
  "spring-elastic": {
    id: "spring-elastic",
    name: "弹性弹跳",
    entrance: {
      springConfig: { mass: 0.6, damping: 12, stiffness: 100 },
      delayFrames: 0,
      durationFrames: 45,
      enterFrom: { type: "translate", x: 0, y: 60 },
    },
    idle: { type: "float", amplitude: 5, frequency: 0.02 },
    exit: { type: "whip-blur", durationFrames: 12 },
  },
  "smooth-scale-up": {
    id: "smooth-scale-up",
    name: "平滑放大",
    entrance: {
      springConfig: { mass: 0.5, damping: 15, stiffness: 90 },
      delayFrames: 0,
      durationFrames: 40,
      enterFrom: { type: "scale", from: 0.85 },
    },
    idle: { type: "breathe", amplitude: 2, frequency: 0.015 },
    exit: { type: "scale-down", durationFrames: 15 },
  },
  "staggered-grow": {
    id: "staggered-grow",
    name: "逐条生长",
    entrance: {
      springConfig: { mass: 0.8, damping: 12, stiffness: 100 },
      delayFrames: 0,
      durationFrames: 50,
      enterFrom: { type: "translate", x: 0, y: 30 },
    },
    idle: { type: "float", amplitude: 2, frequency: 0.02 },
    exit: { type: "fade-out", durationFrames: 10 },
  },
  none: {
    id: "none",
    name: "无动效",
    entrance: {
      springConfig: { mass: 1.0, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 1,
      enterFrom: { type: "translate", x: 0, y: 0 },
    },
  },
};

/** 从 motionMap 中安全获取 MotionPreset */
export function getMotion(map: Record<string, MotionType>, key: string, fallback: MotionType): MotionPreset {
  return motionPresets[map[key] ?? fallback];
}

/** 为特定角色提供默认动效映射 */
export const defaultMotionMap: Record<string, MotionType> = {
  title: "arc-entrance", subtitle: "scale-fade", tagline: "scale-fade",
  points: "spring-slide-up", url: "spring-slide-up", stats: "scale-fade",
  summary: "spring-slide-up", underline: "none", headline: "arc-entrance", body: "spring-slide-up",
};

// ── v3: 情绪 → 动效策略映射 ──
import type { SceneMood, BezierCurve } from "./types";

interface MoodStrategy {
  titleMotion: MotionType; bodyMotion: MotionType;
  bezierCurve?: BezierCurve; useOvershoot: boolean;
  springConfig?: { mass: number; damping: number; stiffness: number };
}

export const moodStrategy: Record<SceneMood, MoodStrategy> = {
  power: { titleMotion: "spring-elastic", bodyMotion: "staggered-grow", springConfig: { mass: 0.6, damping: 12, stiffness: 100 }, useOvershoot: true },
  elegant: { titleMotion: "smooth-scale-up", bodyMotion: "scale-fade", bezierCurve: "ease-out-expo", useOvershoot: false },
  professional: { titleMotion: "arc-entrance", bodyMotion: "spring-slide-up", bezierCurve: "ease-out-quart", useOvershoot: false },
  calm: { titleMotion: "scale-fade", bodyMotion: "subtle-float", bezierCurve: "ease-out-expo", useOvershoot: false },
};

export function resolveMoodMotion(mood: SceneMood | undefined, role: "title" | "body"): MotionType {
  if (!mood) return defaultMotionMap[role === "title" ? "title" : "points"];
  const strategy = moodStrategy[mood];
  return role === "title" ? strategy.titleMotion : strategy.bodyMotion;
}

/** Wire SFX bindings from sfxLibrary into motionPresets in place */
function wireSfx(): void {
  for (const sfx of sfxLibrary) {
    const preset = motionPresets[sfx.motionType];
    if (preset) {
      preset.sfx = {
        src: sfx.src,
        delay: sfx.defaultDelay,
        volume: sfx.defaultVolume,
      };
    }
  }
}
wireSfx();
