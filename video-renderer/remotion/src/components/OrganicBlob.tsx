import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const OFFSETS: Record<Position, { x: number; y: number }> = {
  "top-left": { x: -200, y: -200 },
  "top-right": { x: 200, y: -200 },
  "bottom-left": { x: -200, y: 200 },
  "bottom-right": { x: 200, y: 200 },
};

const BLOB_RADII = [
  "40% 60% 70% 30% / 40% 50% 60% 50%",
  "60% 40% 30% 70% / 50% 60% 40% 50%",
  "45% 55% 50% 50% / 55% 45% 55% 45%",
  "55% 45% 60% 40% / 40% 60% 50% 50%",
];

interface Props {
  color: string;
  delay?: number;
  position?: Position;
  size?: number;
}

export const OrganicBlob: React.FC<Props> = ({ color, delay = 0, position = "top-left", size = 400 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  const { x, y } = OFFSETS[position];
  // Pick a deterministic radius based on position
  const radiusIdx = ["top-left", "top-right", "bottom-left", "bottom-right"].indexOf(position);
  const borderRadius = BLOB_RADII[radiusIdx];

  return (
    <div style={{
      position: "absolute",
      width: size, height: size,
      backgroundColor: color,
      borderRadius,
      transform: `translate(${interpolate(progress, [0, 1], [x, 0])}px, ${interpolate(progress, [0, 1], [y, 0])}px) scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
      opacity: interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
      willChange: "transform, opacity",
    }} />
  );
};
