/**
 * useLifecycle — 元素完整生命周期 Hook (Intro → Idle → Outro)。
 *
 * 三阶段状态机：
 *   Intro  (0 → durationFrames)     : 入场动效
 *   Idle   (durationFrames → dur-outroFrames) : 悬停呼吸
 *   Outro  (dur-outroFrames → dur)  : 退场动效
 *
 * 与 useEntrance 互补：useEntrance 只处理 Intro，useLifecycle 覆盖全部三阶段。
 */
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { MotionPreset, SpringConfig } from "../types";
import { useBezierAnim } from "./useBezierAnim";

export interface LifecycleResult {
  transform: string;
  opacity: number;
  filter?: string;
  /** 当前生命阶段 */
  phase: "intro" | "idle" | "outro";
  /** Entrance spring progress 0-1 */
  introProgress: number;
  /** Idle float Y offset (px) */
  idleOffset: number;
  /** Outro progress 0-1 */
  outroProgress: number;
}

export function useLifecycle(
  motion: MotionPreset,
  sceneDurationFrames: number,
  /** staggerIndex for ordered entrance (0-based) */
  staggerIndex: number = 0,
): LifecycleResult {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ent = motion.entrance;
  const staggerFrames = ent.staggerFrames ?? 10;
  const delay = ent.delayFrames + staggerIndex * staggerFrames;
  const effectiveFrame = Math.max(0, frame - delay);

  // ── Phase 1: Intro ──
  const introProgress = ent.easingCurve
    ? useBezierAnim(ent.easingCurve, ent.durationFrames, delay)
    : spring({
        frame: frame - delay,
        fps,
        config: advanceSC(ent.springConfig, fps),
        durationInFrames: ent.durationFrames,
      });

  // ── Phase 2: Idle (subtle float) ──
  const idle = motion.idle;
  const idleFrames = Math.max(0, sceneDurationFrames - ent.durationFrames - (motion.exit?.durationFrames ?? 0));
  let idleOffset = 0;

  if (idle && idle.type === "float") {
    const idleFrame = Math.max(0, effectiveFrame - ent.durationFrames);
    const amplitude = idle.amplitude ?? 3;
    const frequency = idle.frequency ?? 0.02;
    idleOffset = Math.sin(idleFrame * frequency) * amplitude;
  }

  // ── Phase 3: Outro ──
  const exit = motion.exit;
  const outroStart = sceneDurationFrames - (exit?.durationFrames ?? 0);
  let outroProgress = 0;
  if (exit && frame >= outroStart) {
    outroProgress = interpolate(frame, [outroStart, sceneDurationFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // ── Determine phase ──
  let phase: "intro" | "idle" | "outro" = "intro";
  if (effectiveFrame >= ent.durationFrames) {
    phase = frame >= outroStart ? "outro" : "idle";
  }

  // ── Compute transform + opacity ──
  const ef = ent.enterFrom;
  let transform = "";
  let opacity = 1;
  let filter: string | undefined;

  if (phase === "intro") {
    const p = introProgress;
    opacity = interpolate(effectiveFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

    if (ef.type === "translate") {
      const tx = interpolate(p, [0, 1], [ef.x, 0]);
      const ty = interpolate(p, [0, 1], [ef.y, 0]);
      transform = `translate(${tx}px, ${ty + idleOffset}px)`;
    } else if (ef.type === "scale") {
      const s = interpolate(p, [0, 1], [ef.from, 1]);
      if (motion.id === "blur-focus") {
        const blur = interpolate(p, [0, 1], [8, 0]);
        filter = `blur(${blur}px)`;
      }
      transform = `scale(${s}) translateY(${idleOffset}px)`;
    } else {
      transform = `translateY(${idleOffset}px)`;
    }
  } else if (phase === "idle") {
    opacity = 1;
    transform = `translateY(${idleOffset}px)`;
  } else {
    // Outro
    if (exit?.type === "fade-out") {
      opacity = 1 - outroProgress;
    } else if (exit?.type === "scale-down") {
      const s = interpolate(outroProgress, [0, 1], [1, 0.9]);
      opacity = 1 - outroProgress;
      transform = `scale(${s}) translateY(${idleOffset}px)`;
    } else if (exit?.type === "slide-out") {
      const tx = interpolate(outroProgress, [0, 1], [0, -80]);
      opacity = 1 - outroProgress;
      transform = `translateX(${tx}px) translateY(${idleOffset}px)`;
    }
  }

  return { transform, opacity, filter, phase, introProgress, idleOffset, outroProgress };
}

/** 将 SpringConfig 转换为 Remotion spring config（duration override） */
function advanceSC(sc: SpringConfig, _fps: number): { mass: number; damping: number; stiffness: number } {
  return { mass: sc.mass, damping: sc.damping, stiffness: sc.stiffness };
}
