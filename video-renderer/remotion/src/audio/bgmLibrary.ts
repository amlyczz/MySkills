/**
 * bgmLibrary.ts — BGM 模板库。
 *
 * 按 mood 索引的 BGM 条目。Phase 2 先定义数据结构，
 * 实际音频文件后续补充。
 */
import { BgmMood, BgmTrack } from "../types";

interface BgmEntry {
  id: string;
  src: string;
  bpm: number;
  mood: BgmMood;
  displayName: string;
}

/**
 * BGM 模板库。
 *
 * src 路径相对于 remotion/public/ 目录。
 * 当前只有占位条目，Phase 4 补充实际音频文件。
 */
export const bgmLibrary: BgmEntry[] = [
  {
    id: "tech-pulse",
    src: "audio/bgm/tech-pulse.mp3",
    bpm: 120,
    mood: "tech",
    displayName: "Tech Pulse",
  },
  {
    id: "upbeat-energy",
    src: "audio/bgm/upbeat-energy.mp3",
    bpm: 128,
    mood: "upbeat",
    displayName: "Upbeat Energy",
  },
  {
    id: "chill-ambient",
    src: "audio/bgm/chill-ambient.mp3",
    bpm: 90,
    mood: "chill",
    displayName: "Chill Ambient",
  },
  {
    id: "cinematic-rise",
    src: "audio/bgm/cinematic-rise.mp3",
    bpm: 100,
    mood: "cinematic",
    displayName: "Cinematic Rise",
  },
  {
    id: "corporate-clean",
    src: "audio/bgm/corporate-clean.mp3",
    bpm: 110,
    mood: "corporate",
    displayName: "Corporate Clean",
  },
];

/** 按 mood 查找 BGM */
export function getBgmByMood(mood: BgmMood): BgmEntry | undefined {
  return bgmLibrary.find((b) => b.mood === mood);
}

/** BgmEntry → BgmTrack 转换（用于 VideoConfig） */
export function toBgmTrack(entry: BgmEntry): BgmTrack {
  return {
    id: entry.id,
    src: entry.src,
    bpm: entry.bpm,
    mood: entry.mood,
  };
}
