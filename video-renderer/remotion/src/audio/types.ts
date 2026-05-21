/**
 * audio/types.ts — 听觉系统类型定义（预留槽位）。
 *
 * Phase 1 只定义类型接口，不实现渲染。
 * Phase 2 实现 BGM，Phase 3 实现 SFX + Voiceover。
 *
 * 类型已在 types.ts 中定义，此文件重新导出并提供音频专属的辅助类型。
 */

export type {
  BgmMood,
  VolumePoint,
  BgmTrack,
  VoiceoverTrack,
  VoiceoverSegment,
  SfxBinding,
  AudioConfig,
} from "../types";

/** BGM 模板库条目 */
export interface BgmTemplate {
  id: string;
  src: string;
  bpm: number;
  mood: import("../types").BgmMood;
  displayName: string;
}

/** 音效模板库条目 */
export interface SfxTemplate {
  id: string;
  /** 关联的动效类型 */
  motionType: string;
  src: string;
  displayName: string;
  /** 默认音量 0-1 */
  defaultVolume: number;
}
