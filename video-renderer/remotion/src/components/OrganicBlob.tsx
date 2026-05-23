import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const OFFSETS: Record<Position, { x: number; y: number }> = {
  "top-left": { x: -200, y: -200 },
  "top-right": { x: 200, y: -200 },
  "bottom-left": { x: -200, y: 200 },
  "bottom-right": { x: 200, y: 200 },
};

interface Props { color: string; delay?: number; position?: Position; size?: number; morphing?: boolean; }

export const OrganicBlob: React.FC<Props> = ({ color, delay = 0, position = "top-left", size = 400, morphing = false }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, 60], [0, 1], { extrapolateRight: "clamp" });
  const { x, y } = OFFSETS[position];

  // Organic morphing: dynamic border-radius driven by sine waves
  const r1 = morphing ? 40 + Math.sin(frame / 30) * 20 : 40;
  const r2 = morphing ? 60 + Math.cos(frame / 20) * 25 : 60;
  const r3 = morphing ? 50 + Math.sin(frame / 40) * 20 : 70;
  const r4 = morphing ? 30 + Math.cos(frame / 35) * 15 : 30;
  const borderRadius = morphing
    ? `${r1}% ${100 - r1}% ${r2}% ${100 - r2}% / ${r3}% ${r4}% ${100 - r4}% ${100 - r3}%`
    : `${40 + (position.charCodeAt(0) % 4) * 10}% ${60 - (position.charCodeAt(1) % 4) * 10}% ${70 - (position.charCodeAt(2) % 4) * 10}% ${30 + (position.charCodeAt(3) % 4) * 10}% / 40% 50% 60% 50%`;

  return (
    <div style={{
      position: "absolute", width: size, height: size,
      backgroundColor: color, borderRadius,
      transform: `translate(${interpolate(progress, [0, 1], [x, 0])}px, ${interpolate(progress, [0, 1], [y, 0])}px) scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
      opacity: interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
      willChange: "transform, opacity",
      filter: "blur(0px)",
      transition: "none",
    }} />
  );
};
