/**
 * useHeroTitle — 标题动画 Hook。
 * 处理 anticipate 微反向位移 + spring/arc 入场。
 */
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { MotionType, MotionPreset } from "../types";
import { motionPresets, getMotion } from "../motions";
import { useEntrance } from "./useEntrance";
import { TIMING, ANTICIPATE_FRAMES } from "../animations";

export function useHeroTitle(motionMap: Record<string, MotionType>) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleMotion = getMotion(motionMap, "title", "arc-entrance");
  const titleLocalFrame = Math.max(0, frame - TIMING.TITLE_INTRO[0]);

  const anticipateX = interpolate(titleLocalFrame, [0, ANTICIPATE_FRAMES], [-5, 0], { extrapolateRight: "clamp" });
  const anticipateY = interpolate(titleLocalFrame, [0, ANTICIPATE_FRAMES], [3, 0], { extrapolateRight: "clamp" });

  const entrance = useEntrance(titleMotion, titleLocalFrame);
  const opacity = interpolate(titleLocalFrame, [0, ANTICIPATE_FRAMES], [0, 1], { extrapolateRight: "clamp" });

  const ef = titleMotion.entrance.enterFrom;
  const isSpatial = ef.type === "arc" || ef.type === "translate";
  const transform = isSpatial
    ? entrance.transform.replace(/translate\(([^,]+),\s*([^)]+)\)/, (_: string, x: string, y: string) =>
        `translate(${parseFloat(x) + anticipateX}px, ${parseFloat(y) + anticipateY}px)`)
    : entrance.transform;

  return { opacity, transform, clipPath: entrance.clipPath, filter: entrance.filter };
}
