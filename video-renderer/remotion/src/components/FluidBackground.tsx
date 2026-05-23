import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const FluidBackground: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const t = frame / 60;

  const orbs = [
    { x: interpolate(Math.sin(t), [-1, 1], [20, 60]), y: interpolate(Math.cos(t * 0.7), [-1, 1], [10, 50]), color: "rgba(0,122,255,0.7)", size: "120%" },
    { x: interpolate(Math.cos(t * 0.8), [-1, 1], [40, 80]), y: interpolate(Math.sin(t * 1.1), [-1, 1], [50, 90]), color: `rgba(255,204,0,${0.65 * intensity})`, size: "100%" },
    { x: interpolate(Math.sin(t * 0.9), [-1, 1], [30, 70]), y: interpolate(Math.cos(t * 1.3), [-1, 1], [20, 80]), color: `rgba(255,59,48,${0.6 * intensity})`, size: "140%" },
    { x: interpolate(Math.cos(t * 1.1), [-1, 1], [50, 90]), y: interpolate(Math.sin(t * 0.6), [-1, 1], [30, 70]), color: `rgba(50,173,230,${0.45 * intensity})`, size: "110%" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#040510", overflow: "hidden", filter: "blur(70px)" }}>
      {orbs.map((o, i) => (
        <div key={i} style={{
          position: "absolute", width: o.size, height: o.size,
          background: `radial-gradient(circle, ${o.color} 0%, rgba(0,0,0,0) 60%)`,
          left: `${o.x - 30}%`, top: `${o.y - 30}%`,
        }} />
      ))}
    </AbsoluteFill>
  );
};
