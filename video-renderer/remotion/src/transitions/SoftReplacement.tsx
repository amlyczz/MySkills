import { useCurrentFrame, interpolate } from "remotion";

/**
 * Mode A: Soft Replacement
 *   Exit: opacity 1 -> 0 (15 frames)
 *   Enter: opacity 0 -> 1 (15 frames)
 *   Total crossover: 30 frames
 *   Curve: linear or ease-in-out
 */
export const useSoftEnter = (delayFrames = 0) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delayFrames);
  return {
    opacity: interpolate(elapsed, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
  };
};

export const useSoftExit = (durationInFrames: number) => {
  const frame = useCurrentFrame();
  const exitStart = durationInFrames - 15;
  return {
    opacity: interpolate(frame, [exitStart, durationInFrames], [1, 0], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    }),
  };
};
