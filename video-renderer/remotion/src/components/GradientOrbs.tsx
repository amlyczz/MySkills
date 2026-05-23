import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface OrbProps { color: string; top: string; left: string; size: number; delay: number; }
const Orb: React.FC<OrbProps> = ({ color, top, left, size, delay }) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame - delay, [0, 100, 200], [0, -20, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  return <div style={{ position: "absolute", top, left, width: size, height: size, background: color, borderRadius: "50%", filter: "blur(60px)", opacity: 0.5, transform: `translateY(${y}px)`, zIndex: 0 }} />;
};

export const GradientOrbs: React.FC = () => (
  <AbsoluteFill style={{ background: "#FFFFFF" }}>
    <Orb color="rgba(0,255,200,0.4)" top="10%" left="10%" size={300} delay={0} />
    <Orb color="rgba(150,50,255,0.4)" top="60%" left="70%" size={400} delay={20} />
    <Orb color="rgba(255,100,100,0.3)" top="80%" left="20%" size={250} delay={40} />
  </AbsoluteFill>
);
