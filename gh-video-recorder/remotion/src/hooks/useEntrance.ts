/**
 * useEntrance — 入场动效 Hook。
 *
 * 接收 MotionPreset 和当前场景内帧号，返回 transform + opacity + clipPath + filter。
 * 组件无需关心 spring 参数和 interpolate 细节。
 */
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { MotionPreset, EnterPosition } from "../types";

export interface EntranceResult {
  transform: string;
  opacity: number;
  /** spring 进度 0-1，可用于其他衍生动画 */
  progress: number;
  /** clip-path CSS 值，用于 reveal-mask / typewriter */
  clipPath?: string;
  /** filter CSS 值，用于 blur-focus */
  filter?: string;
}

export function useEntrance(
  motion: MotionPreset,
  /** 相对于场景起点的帧偏移（= 场景内 frame - 该元素的 startFrame） */
  localFrame: number,
): EntranceResult {
  const { fps } = useVideoConfig();
  const { entrance } = motion;

  const effectiveFrame = Math.max(0, localFrame - entrance.delayFrames);

  const progress = spring({
    frame: effectiveFrame,
    fps,
    config: entrance.springConfig,
  });

  const enterFrom = entrance.enterFrom;
  let transform = "";
  let opacity = 1;
  let clipPath: string | undefined;
  let filter: string | undefined;

  resolveEnterFrom(enterFrom, progress, effectiveFrame, motion.id);

  function resolveEnterFrom(
    ef: EnterPosition,
    prog: number,
    frame: number,
    motionId: string,
  ): void {
    switch (ef.type) {
      case "translate": {
        // typewriter 特殊处理：用 clip-path 裁切
        if (motionId === "typewriter") {
          const pct = interpolate(prog, [0, 1], [100, 0]);
          clipPath = `inset(0 ${pct}% 0 0)`;
          opacity = interpolate(frame, [0, 3], [0, 1], {
            extrapolateRight: "clamp",
          });
          break;
        }
        const tx = interpolate(prog, [0, 1], [ef.x, 0]);
        const ty = interpolate(prog, [0, 1], [ef.y, 0]);
        transform = `translate(${tx}px, ${ty}px)`;
        opacity = interpolate(frame, [0, 6], [0, 1], {
          extrapolateRight: "clamp",
        });
        break;
      }
      case "arc": {
        const tx = interpolate(prog, [0, 1], [ef.fromX, 0]);
        const ty = interpolate(prog, [0, 1], [ef.fromY, 0]);
        transform = `translate(${tx}px, ${ty}px)`;
        opacity = interpolate(frame, [0, 6], [0, 1], {
          extrapolateRight: "clamp",
        });
        break;
      }
      case "scale": {
        // blur-focus 特殊处理：模糊 + 缩放
        if (motionId === "blur-focus") {
          const s = interpolate(prog, [0, 1], [ef.from, 1]);
          const blur = interpolate(prog, [0, 1], [8, 0]);
          transform = `scale(${s})`;
          filter = `blur(${blur}px)`;
          opacity = interpolate(frame, [0, 8], [0, 1], {
            extrapolateRight: "clamp",
          });
          break;
        }
        const s = interpolate(prog, [0, 1], [ef.from, 1]);
        transform = `scale(${s})`;
        opacity = interpolate(frame, [0, 8], [0, 1], {
          extrapolateRight: "clamp",
        });
        break;
      }
      case "mask": {
        // 遮罩揭示：通过 clip-path 实现
        const hiddenPct = interpolate(prog, [0, 1], [100, 0]);
        clipPath =
          ef.direction === "left"
            ? `inset(0 0 0 ${hiddenPct}%)`
            : `inset(0 ${hiddenPct}% 0 0)`;
        opacity = 1;
        break;
      }
    }
  }

  return { transform, opacity, progress, clipPath, filter };
}

/**
 * 用于 stagger 列表项的便捷函数。
 * 返回第 i 个元素相对于场景起点的帧偏移。
 */
export function staggerStartFrame(
  baseStartFrame: number,
  index: number,
  staggerFrames: number,
): number {
  return baseStartFrame + index * staggerFrames;
}
