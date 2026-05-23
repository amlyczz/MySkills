import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const FluidBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const x1 = interpolate(Math.sin(frame / 60), [-1, 1], [0, 40]);
  const y1 = interpolate(Math.cos(frame / 80), [-1, 1], [0, 30]);
  const x2 = interpolate(Math.cos(frame / 70), [-1, 1], [60, 100]);
  const y2 = interpolate(Math.sin(frame / 50), [-1, 1], [60, 100]);
  const x3 = interpolate(Math.sin(frame / 90), [-1, 1], [30, 70]);
  const y3 = interpolate(Math.cos(frame / 60), [-1, 1], [20, 80]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#050510", overflow: "hidden", filter: "blur(80px)" }}>
      <div style={{ position: "absolute", width: "120%", height: "120%", background: "radial-gradient(circle, rgba(16,84,234,0.8) 0%, rgba(0,0,0,0) 60%)", left: `${x1 - 20}%`, top: `${y1 - 20}%` }} />
      <div style={{ position: "absolute", width: "100%", height: "100%", background: "radial-gradient(circle, rgba(255,214,0,0.7) 0%, rgba(0,0,0,0) 60%)", left: `${x2 - 50}%`, top: `${y2 - 50}%` }} />
      <div style={{ position: "absolute", width: "150%", height: "150%", background: "radial-gradient(circle, rgba(255,69,0,0.65) 0%, rgba(0,0,0,0) 50%)", left: `${x3 - 50}%`, top: `${y3 - 50}%` }} />
    </AbsoluteFill>
  );
};
