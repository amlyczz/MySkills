import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface Props { colors?: string[]; speed?: number; }

export const MeshGradientBg: React.FC<Props> = ({
  colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#06B6D4", "#F59E0B"],
  speed = 0.3,
}) => {
  const frame = useCurrentFrame();
  const t = frame * speed;

  return (
    <AbsoluteFill className="!z-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 80% 60% at ${50 + Math.cos(t * 0.01) * 30}% ${40 + Math.sin(t * 0.013) * 25}%, ${colors[0]}44 0%, transparent 60%),
          radial-gradient(ellipse 60% 70% at ${30 + Math.sin(t * 0.015) * 25}% ${60 + Math.cos(t * 0.012) * 20}%, ${colors[1]}33 0%, transparent 55%),
          radial-gradient(ellipse 50% 50% at ${70 + Math.cos(t * 0.011) * 20}% ${30 + Math.sin(t * 0.014) * 30}%, ${colors[2]}22 0%, transparent 50%),
          radial-gradient(ellipse 70% 60% at ${40 + Math.sin(t * 0.008) * 35}% ${50 + Math.cos(t * 0.009) * 25}%, ${colors[3]}33 0%, transparent 60%),
          radial-gradient(ellipse 55% 55% at ${60 + Math.cos(t * 0.017) * 25}% ${70 + Math.sin(t * 0.01) * 20}%, ${colors[4]}22 0%, transparent 55%),
          #050510
        `,
      }} />
    </AbsoluteFill>
  );
};
