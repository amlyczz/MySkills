/**
 * useBezierAnim — CSS Cubic-Bezier 缓动动画 Hook。
 *
 * 与 Remotion spring() 互补：spring 用于物理回弹，bezier 用于优雅缓动。
 * 通过 interpolate 映射 CSS 标准贝塞尔曲线到 Remotion 帧空间。
 *
 * 曲线参考：https://easings.net/
 */
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BezierCurve } from "../types";

/** CSS cubic-bezier control points */
const CURVES: Record<BezierCurve, [number, number, number, number]> = {
  "ease-out-expo":    [0.16, 1, 0.3, 1],
  "ease-out-quart":   [0.25, 1, 0.5, 1],
  "ease-in-out-cubic": [0.65, 0, 0.35, 1],
};

/**
 * 将贝塞尔曲线在 [0,1] 区间的进度映射到 Remotion 帧空间。
 *
 * 算法：用 de Casteljau 采样贝塞尔曲线，t = frame/durationFrames 映射到实际进度 progress。
 *
 * @param curve  贝塞尔曲线 ID
 * @param frame  当前帧
 * @param durationFrames  动画总帧数
 * @param delayFrames  延迟帧数
 * @returns progress 0-1
 */
export function useBezierAnim(
  curve: BezierCurve,
  durationFrames: number,
  delayFrames: number = 0,
): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const effectiveFrame = Math.max(0, frame - delayFrames);
  const t = Math.min(1, effectiveFrame / durationFrames);

  // de Casteljau 采样 3 阶贝塞尔
  const [cp1x, cp1y, cp2x, cp2y] = CURVES[curve];

  // 对 x 轴做 de Casteljau → 找到 t 对应的 x，然后用 t 求 y
  // 简化：均匀采样 100 点，用 t 查找对应 x 的 y 值
  const samples = 100;
  for (let i = 0; i <= samples; i++) {
    const tt = i / samples;
    const x = cubicBezier(tt, 0, cp1x, cp2x, 1);
    if (x >= t) {
      const y = cubicBezier(tt, 0, cp1y, cp2y, 1);
      return interpolate(t, [0, cubicBezier((i - 1) / samples, 0, cp1x, cp2x, 1)], [0, y], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
  }

  return 1;
}

function cubicBezier(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}
