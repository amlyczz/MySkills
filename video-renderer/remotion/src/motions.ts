/**
 * motions.ts — 动效模板库。
 *
 * 定义 MotionPreset 预设，封装 spring 参数和入场方向。
 * 每个动效模板可绑定 SFX（预留）。
 */
import { MotionPreset, MotionType } from "./types";

export type { MotionType };

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
    exit: { type: "slide-out", durationFrames: 20 },
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
    exit: { type: "fade-out", durationFrames: 15 },
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
    idle: { type: "glow", amplitude: 0.3, frequency: 0.03 },
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

/** 为特定角色提供默认动效映射 */
export const defaultMotionMap: Record<string, MotionType> = {
  title: "arc-entrance",
  subtitle: "scale-fade",
  tagline: "scale-fade",
  points: "spring-slide-up",
  url: "spring-slide-up",
  stats: "scale-fade",
  summary: "spring-slide-up",
  underline: "none",
  headline: "arc-entrance",
  body: "spring-slide-up",
};
