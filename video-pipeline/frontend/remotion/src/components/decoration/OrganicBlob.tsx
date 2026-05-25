import React from "react";
import { useCurrentFrame } from "remotion";

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface Props { color: string; position?: Position; size?: number; morphing?: boolean; className?: string; }

export const OrganicBlob: React.FC<Props> = ({ color, position = "top-left", size = 400, morphing = false, className = "" }) => {
  const frame = useCurrentFrame();

  // Organic morphing: dynamic border-radius driven by sine waves
  const r1 = morphing ? 40 + Math.sin(frame / 30) * 20 : 40;
  const r2 = morphing ? 60 + Math.cos(frame / 20) * 25 : 60;
  const r3 = morphing ? 50 + Math.sin(frame / 40) * 20 : 70;
  const r4 = morphing ? 30 + Math.cos(frame / 35) * 15 : 30;
  const borderRadius = morphing
    ? `${r1}% ${100 - r1}% ${r2}% ${100 - r2}% / ${r3}% ${r4}% ${100 - r4}% ${100 - r3}%`
    : `${40 + (position.charCodeAt(0) % 4) * 10}% ${60 - (position.charCodeAt(1) % 4) * 10}% ${70 - (position.charCodeAt(2) % 4) * 10}% ${30 + (position.charCodeAt(3) % 4) * 10}% / 40% 50% 60% 50%`;

  return (
    <div
      className={`relative filter-none transition-none ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius,
      }}
    />
  );
};
