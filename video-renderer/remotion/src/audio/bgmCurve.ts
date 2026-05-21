/**
 * bgmCurve.ts — BGM 音量曲线自动生成。
 *
 * 根据结构模板的场景序列和配音情况，生成全片音量曲线。
 * 作用域：视频级。
 *
 * 规则：
 *   - hook 场景：BGM 渐入（fade in）
 *   - 有配音的场景：BGM 降低到 0.15（ducking）
 *   - 无配音的场景：BGM 正常 0.5
 *   - cta 场景：BGM 渐出（fade out）
 */
import { StructureTemplate, VolumePoint, VoiceoverSegment } from "../types";

/** 默认音量 */
const VOL_NORMAL = 0.5;
const VOL_DUCKED = 0.15;
const VOL_FADE_START = 0.0;
const FADE_SECONDS = 1.5;

/**
 * 判断某场景是否有配音。
 */
function hasVoiceover(
  sceneId: string,
  voiceover: VoiceoverSegment[],
): boolean {
  return voiceover.some((v) => v.sceneId === sceneId);
}

/**
 * 生成 BGM 音量曲线。
 *
 * @param structure 结构模板
 * @param voiceover 配音段落（可能为空）
 * @param totalDurationSeconds 视频总时长
 * @returns VolumePoint[] 按时间排序的音量关键点
 */
export function generateBgmCurve(
  structure: StructureTemplate,
  voiceover: VoiceoverSegment[],
  totalDurationSeconds: number,
): VolumePoint[] {
  const points: VolumePoint[] = [];

  // 计算每个场景的起始时间
  let sceneStart = 0;
  const sceneTimings: { id: string; type: string; start: number; duration: number }[] = [];

  for (const scene of structure.scenes) {
    sceneTimings.push({
      id: scene.id,
      type: scene.type,
      start: sceneStart,
      duration: scene.durationSeconds || 10, // showcase 动态时长
    });
    sceneStart += scene.durationSeconds || 10;
  }

  for (const timing of sceneTimings) {
    const { id, type, start, duration } = timing;
    const end = start + duration;
    const hasVo = hasVoiceover(id, voiceover);

    // hook：渐入
    if (type === "hook") {
      points.push({ time: Math.max(0, start), volume: VOL_FADE_START });
      points.push({ time: start + FADE_SECONDS, volume: hasVo ? VOL_DUCKED : VOL_NORMAL });
      continue;
    }

    // cta：渐出
    if (type === "cta") {
      points.push({ time: start, volume: hasVo ? VOL_DUCKED : VOL_NORMAL });
      points.push({ time: Math.max(0, end - FADE_SECONDS), volume: VOL_NORMAL * 0.6 });
      points.push({ time: end, volume: VOL_FADE_START });
      continue;
    }

    // 其他场景：ducking 或正常
    points.push({ time: start, volume: hasVo ? VOL_DUCKED : VOL_NORMAL });
    points.push({ time: end, volume: hasVo ? VOL_DUCKED : VOL_NORMAL });
  }

  // 按时间排序，去除重复时间点
  return points
    .sort((a, b) => a.time - b.time)
    .filter((p, i, arr) => i === 0 || Math.abs(p.time - arr[i - 1].time) > 0.01);
}
