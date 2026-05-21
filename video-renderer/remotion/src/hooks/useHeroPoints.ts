/**
 * useHeroPoints — 要点列表错峰入场 Hook。
 * 处理 stagger 延迟 + arc 角度展开。
 */
import { useCurrentFrame, interpolate } from "remotion";
import { MotionType } from "../types";
import { getMotion } from "../motions";
import { useEntrance, staggerStartFrame } from "./useEntrance";
import { TIMING } from "../animations";

export function useHeroPoints(motionMap: Record<string, MotionType>, points: string[], maxPoints = 5) {
  const frame = useCurrentFrame();
  const pointMotion = getMotion(motionMap, "points", "spring-slide-up");

  return points.slice(0, maxPoints).map((point, i) => {
    const localFrame = Math.max(0, frame - staggerStartFrame(TIMING.POINTS_START, i, TIMING.POINTS_STAGGER));
    const entrance = useEntrance(pointMotion, localFrame);

    let transform = entrance.transform;
    if (pointMotion.entrance.enterFrom.type === "arc") {
      const ef = pointMotion.entrance.enterFrom as { type: "arc"; fromX: number; fromY: number };
      const angleSpread = (i - 2) * 12;
      transform = `translate(${interpolate(entrance.progress, [0, 1], [-30 + angleSpread, 0])}px, ${interpolate(entrance.progress, [0, 1], [ef.fromY, 0])}px)`;
    }

    return { point, i, opacity: entrance.opacity, transform, clipPath: entrance.clipPath, filter: entrance.filter };
  });
}
