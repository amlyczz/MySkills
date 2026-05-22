/**
 * sfxLibrary.ts — 音效模板库。
 *
 * 按动效类型索引的音效条目。
 * 每个动效模板可声明一个关联音效，元素入场时自动触发。
 */
import { MotionType } from "../types";
import { whoosh } from "@remotion/sfx";

export interface SfxEntry {
  /** 关联的动效类型 */
  motionType: MotionType;
  /** 音效文件路径（相对于 remotion/public/ 或完整 URL） */
  src: string;
  /** 默认音量 0-1 */
  defaultVolume: number;
  /** 默认延迟（秒），通常 0 = 与入场动画同步 */
  defaultDelay: number;
}

/**
 * 音效模板库。
 *
 * 路径相对于 remotion/public/ 目录。
 */
export const sfxLibrary: SfxEntry[] = [
  // 入场音效
  {
    motionType: "arc-entrance",
    src: "audio/sfx/whoosh-soft.mp3",
    defaultVolume: 0.6,
    defaultDelay: 0,
  },
  {
    motionType: "spring-slide-up",
    src: "audio/sfx/swoosh-up.mp3",
    defaultVolume: 0.4,
    defaultDelay: 0,
  },
  {
    motionType: "spring-slide-left",
    src: "audio/sfx/swoosh-up.mp3",
    defaultVolume: 0.4,
    defaultDelay: 0,
  },
  {
    motionType: "scale-fade",
    src: "audio/sfx/pop-soft.mp3",
    defaultVolume: 0.4,
    defaultDelay: 0,
  },
  {
    motionType: "bounce-in",
    src: "audio/sfx/bounce.mp3",
    defaultVolume: 0.5,
    defaultDelay: 0,
  },
  {
    motionType: "typewriter",
    src: "audio/sfx/type-keystroke.mp3",
    defaultVolume: 0.3,
    defaultDelay: 0,
  },
  {
    motionType: "reveal-mask",
    src: "audio/sfx/swoosh-reveal.mp3",
    defaultVolume: 0.5,
    defaultDelay: 0,
  },
  // v3 弹性动效（复用已有音效文件）
  {
    motionType: "spring-elastic",
    src: "audio/sfx/bounce.mp3",
    defaultVolume: 0.5,
    defaultDelay: 0,
  },
  {
    motionType: "smooth-scale-up",
    src: "audio/sfx/pop-soft.mp3",
    defaultVolume: 0.4,
    defaultDelay: 0,
  },
  {
    motionType: "staggered-grow",
    src: "audio/sfx/swoosh-up.mp3",
    defaultVolume: 0.4,
    defaultDelay: 0,
  },
  {
    motionType: "blur-focus",
    src: "audio/sfx/whoosh-soft.mp3",
    defaultVolume: 0.6,
    defaultDelay: 0,
  },
];

/** 按动效类型查找音效 */
export function getSfxByMotion(motionType: MotionType): SfxEntry | undefined {
  return sfxLibrary.find((s) => s.motionType === motionType);
}

/** 获取所有已注册音效的动效类型 */
export function getSfxMotionTypes(): Set<MotionType> {
  return new Set(sfxLibrary.map((s) => s.motionType));
}
