import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

/**
 * Mode C: Stack Pop-in
 *   New layer appears on top without affecting underlying layers.
 *   Animation: translateY + scale + opacity
 *   Driver: spring
 */
export const useStackPopIn = (delayFrames = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - delayFrames);
  const progress = spring({
    frame: elapsed,
    fps,
    config: { mass: 1, damping: 14, stiffness: 100 },
  });
  return {
    opacity: interpolate(progress, [0, 1], [0, 1]),
    translateY: interpolate(progress, [0, 1], [30, 0]),
    scale: interpolate(progress, [0, 1], [0.95, 1]),
    progress,
  };
};
