import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface Props {
  /** SVG path data */
  d: string;
  /** Frame to start drawing */
  startFrame: number;
  /** Duration in frames */
  durationFrames?: number;
  /** Stroke color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
}

export const ConnectionLine: React.FC<Props> = ({
  d,
  startFrame,
  durationFrames = 30,
  color = "#D4D4D8",
  strokeWidth = 1.5,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const progress = interpolate(elapsed, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const pathLength = 1000;
  const dashOffset = pathLength * (1 - progress);

  return (
    <svg
      width="100%" height="100%"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
      viewBox="0 0 1920 1080"
    >
      <path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
};
