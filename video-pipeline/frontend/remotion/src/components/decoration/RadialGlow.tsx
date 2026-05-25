import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { AbsoluteFill } from "remotion";

interface Props {
  color?: string;
  delay?: number;
  size?: number;
  intensity?: number;
}

export const RadialGlow: React.FC<Props> = ({
  color = "#FFD700",
  delay = 0,
  size = 1200,
  intensity = 0.3,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delay);
  const opacity = interpolate(elapsed, [0, 30], [0, intensity], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: size, height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        transform: "translate(-50%, -50%)", opacity,
      }} />
    </AbsoluteFill>
  );
};
