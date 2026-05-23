import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export const ProgressRing: React.FC<{ progress: number; size?: number; stroke?: number; fillColor?: string; trackColor?: string; startFrame?: number; duration?: number }> =
({ progress, size = 120, stroke = 10, fillColor = "#2563EB", trackColor = "#E2E8F0", startFrame = 30, duration = 60 }) => {
  const frame = useCurrentFrame();
  const animP = interpolate(frame - startFrame, [0, duration], [0, progress], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (animP / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={fillColor} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
};
