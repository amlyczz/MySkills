import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props { startFrame: number; durationFrames?: number; color: string; }

export const DiagonalWipeTransition: React.FC<Props> = ({ startFrame, durationFrames = 30, color }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - startFrame, [0, durationFrames], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0, background: color, zIndex: 999,
      clipPath: `polygon(0 0, ${progress * 250}% 0, 0 ${progress * 250}%)`,
      pointerEvents: "none",
    }} />
  );
};
