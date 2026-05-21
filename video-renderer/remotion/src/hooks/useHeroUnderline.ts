/**
 * useHeroUnderline — 下划线生长动画 Hook。
 */
import { useCurrentFrame, interpolate } from "remotion";
import { TIMING } from "../animations";
import { UNDERLINE_MAX_WIDTH } from "../layout";

export function useHeroUnderline() {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, TIMING.UNDERLINE_GROW, [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const width = interpolate(progress, [0, 1], [0, UNDERLINE_MAX_WIDTH]);
  return { width };
}
