import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

/**
 * Mode B: Spatial Shift
 *   Center text translates X: 0 -> -30%
 *   Right container enters with its own animation
 *   Duration: 45 frames
 *   Easing: spring({ mass: 1, damping: 14 })
 */
export const useSpatialShiftLeft = (delayFrames = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - delayFrames);
  const progress = spring({
    frame: elapsed,
    fps,
    config: { mass: 1, damping: 14 },
  });
  return {
    translateX: interpolate(progress, [0, 1], [0, -30]),
    opacity: interpolate(progress, [0, 1], [1, 0.9]),
    progress,
  };
};

export const useSpatialShiftRightEnter = (delayFrames = 15) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - delayFrames);
  const progress = spring({
    frame: elapsed,
    fps,
    config: { mass: 1, damping: 14 },
  });
  return {
    opacity: interpolate(progress, [0, 1], [0, 1]),
    translateX: interpolate(progress, [0, 1], [60, 0]),
    progress,
  };
};
