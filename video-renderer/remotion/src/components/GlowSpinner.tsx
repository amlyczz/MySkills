import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors, glow } from "../theme/tokens";

interface Props {
  size?: number;
  strokeWidth?: number;
}

export const GlowSpinner: React.FC<Props> = ({ size = 40, strokeWidth = 2 }) => {
  const frame = useCurrentFrame();
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (frame * 3) % circumference / circumference;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ filter: `drop-shadow(${glow.orbit})`, transform: `rotate(${frame * 2}deg)` }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={colors.neon}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        opacity={0.8}
      />
    </svg>
  );
};
