import React, { type ReactNode } from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface Props {
  children: ReactNode; delay?: number;
  rotX?: number; rotY?: number; scale?: number;
  zIdx?: number; glow?: boolean;
  style?: React.CSSProperties;
}

export const FloatingCard: React.FC<Props> = ({ children, delay = 0, rotX = 0, rotY = 0, scale = 1, zIdx = 1, glow = false, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 12, stiffness: 80 } });
  const scl = interpolate(s, [0, 1], [0.5, scale]);
  const opacity = interpolate(s, [0, 0.5], [0, 1]);
  const rx = interpolate(s, [0, 1], [rotX, 0]);
  const ry = interpolate(s, [0, 1], [rotY, 0]);
  const floatY = Math.sin((frame + delay) * 0.02) * 8;

  return (
    <div style={{
      transform: `perspective(1000px) scale(${scl}) rotateX(${rx}deg) rotateY(${ry}deg) translateY(${floatY}px)`,
      opacity,
      zIndex: zIdx,
      boxShadow: glow ? "0 0 30px rgba(66,133,244,0.4)" : "0 20px 50px rgba(0,0,0,0.5)",
      borderRadius: 20, overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
};
