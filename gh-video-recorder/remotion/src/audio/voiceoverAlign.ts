/**
 * voiceoverAlign.ts — 口播配音拆段 + 与动效 timing 对齐。
 *
 * 将口播脚本文本拆分为段落，分配到场景内的内容元素，
 * 计算每段音频的秒偏移（基于动效模板的 entrance.delayFrames）。
 */
import {
  VoiceoverSegment,
  MotionType,
  ContentSlot,
} from "../types";
import { motionPresets } from "../motions";

/**
 * 按标点将口播文本拆分为句子/段落。
 */
export function splitByPunctuation(text: string): string[] {
  // 按中英文句号、感叹号、问号分句
  const raw = text.split(/[。！？.!?\n]+/).map((s) => s.trim());
  return raw.filter((s) => s.length > 0);
}

/**
 * 将拆分后的段落分配到场景内容槽位。
 *
 * 分配规则：
 *   - 第 1 段 → title / headline
 *   - 第 2 段 → subtitle / tagline
 *   - 第 3+ 段 → points[0], points[1], ...
 *   - 最后 1-2 段 → summary（如果是 cta 场景）
 */
export function assignSegmentsToSlots(
  segments: string[],
  slots: ContentSlot[],
  sceneType: string,
): { elementRole: string; text: string }[] {
  const assignments: { elementRole: string; text: string }[] = [];
  let segIdx = 0;

  // 先分配 title/headline
  const titleSlot = slots.find(
    (s) => s.name === "title" || s.name === "headline",
  );
  if (titleSlot && segIdx < segments.length) {
    assignments.push({
      elementRole: titleSlot.name,
      text: segments[segIdx++],
    });
  }

  // 再分配 subtitle/tagline
  const subSlot = slots.find(
    (s) => s.name === "subtitle" || s.name === "tagline",
  );
  if (subSlot && segIdx < segments.length) {
    assignments.push({
      elementRole: subSlot.name,
      text: segments[segIdx++],
    });
  }

  // 分配 points
  const pointsSlot = slots.find((s) => s.name === "points");
  if (pointsSlot && segIdx < segments.length) {
    const maxPoints = pointsSlot.maxLines ?? 5;
    const remaining = segments.slice(segIdx, segIdx + maxPoints);
    for (let i = 0; i < remaining.length; i++) {
      assignments.push({
        elementRole: `points[${i}]`,
        text: remaining[i],
      });
    }
    segIdx += remaining.length;
  }

  // cta 场景：最后分配 summary
  if (sceneType === "cta" && segIdx < segments.length) {
    const summarySlot = slots.find((s) => s.name === "summary");
    if (summarySlot) {
      assignments.push({
        elementRole: "summary",
        text: segments.slice(segIdx).join("。"),
      });
    }
  }

  return assignments;
}

/**
 * 计算配音段落的秒偏移。
 *
 * 对于 points[i] 等列表项，使用 stagger 间隔。
 */
export function computeStartOffset(
  elementRole: string,
  motionMap: Record<string, MotionType>,
  fps: number,
): number {
  // 处理 points[N] 格式
  const pointsMatch = elementRole.match(/^points\[(\d+)\]$/);
  if (pointsMatch) {
    const idx = parseInt(pointsMatch[1]);
    // points 使用 TIMING.POINTS_START + idx * POINTS_STAGGER
    // 这里用简化版：每个 point 间隔 18 帧 = 0.6s
    const staggerFrames = 18;
    const pointsStartFrames = 110; // TIMING.POINTS_START
    return (pointsStartFrames + idx * staggerFrames) / fps;
  }

  // 处理 title/headline
  if (elementRole === "title" || elementRole === "headline") {
    return 20 / fps; // TIMING.TITLE_INTRO[0]
  }

  // 处理 subtitle/tagline
  if (elementRole === "subtitle" || elementRole === "tagline") {
    return 80 / fps; // TIMING.TAGLINE_INTRO[0]
  }

  // 处理 summary
  if (elementRole === "summary") {
    return 120 / fps; // TIMING.SUMMARY_INTRO[0]
  }

  // 处理 url / stats
  if (elementRole === "url") {
    return 20 / fps; // TIMING.URL_INTRO[0]
  }
  if (elementRole === "stats") {
    return 60 / fps; // TIMING.STATS_INTRO[0]
  }

  return 0;
}

/**
 * 对齐口播脚本到场景内容元素。
 *
 * @param sceneId 场景 ID
 * @param scriptText 口播脚本文本
 * @param slots 场景内容槽位
 * @param sceneType 场景类型
 * @param motionMap 动效映射
 * @param fps 帧率
 * @param estimatedAudioDurationPerSegment 每段预估音频时长（秒），默认 2s
 * @returns VoiceoverSegment[]
 */
export function alignVoiceoverToScene(
  sceneId: string,
  scriptText: string,
  slots: ContentSlot[],
  sceneType: string,
  motionMap: Record<string, MotionType>,
  fps: number = 30,
  estimatedAudioDurationPerSegment: number = 2,
): VoiceoverSegment[] {
  const segments = splitByPunctuation(scriptText);
  const assignments = assignSegmentsToSlots(segments, slots, sceneType);

  return assignments.map((a) => ({
    sceneId,
    elementRole: a.elementRole,
    src: "", // 音频路径由 allocate 阶段填充（TTS 生成后）
    text: a.text,
    durationSeconds: estimatedAudioDurationPerSegment,
    startOffsetSeconds: computeStartOffset(a.elementRole, motionMap, fps),
  }));
}

/**
 * 校验配音段落总时长是否超出场景时长。
 */
export function validateVoiceoverTiming(
  sceneDurationSeconds: number,
  segments: VoiceoverSegment[],
): { valid: boolean; overflow: number } {
  if (segments.length === 0) return { valid: true, overflow: 0 };

  const lastSeg = segments[segments.length - 1];
  const voiceoverEnd =
    lastSeg.startOffsetSeconds + lastSeg.durationSeconds;

  const overflow = Math.max(0, voiceoverEnd - sceneDurationSeconds);
  return { valid: overflow === 0, overflow };
}
