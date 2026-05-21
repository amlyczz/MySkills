/**
 * useHeroTagline — 标签行/副标题动画 Hook。
 * 处理 scale-fade 特殊入场。
 */
import { useCurrentFrame, interpolate } from "remotion";
import { MotionType } from "../types";
import { getMotion } from "../motions";
import { useEntrance } from "./useEntrance";
import { TIMING } from "../animations";

export function useHeroTagline(motionMap: Record<string, MotionType>) {
  const frame = useCurrentFrame();
  const motion = getMotion(motionMap, "subtitle", "scale-fade");
  const localFrame = Math.max(0, frame - TIMING.TAGLINE_INTRO[0]);
  const entrance = useEntrance(motion, localFrame);

  const isScaleFade = (motionMap["subtitle"] ?? "scale-fade") === "scale-fade";
  const opacity = isScaleFade
    ? interpolate(localFrame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : entrance.opacity;
  const scale = isScaleFade ? interpolate(localFrame, [0, 15], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const transform = isScaleFade ? `scale(${scale})` : entrance.transform;

  return { opacity, transform, clipPath: entrance.clipPath, filter: entrance.filter };
}
