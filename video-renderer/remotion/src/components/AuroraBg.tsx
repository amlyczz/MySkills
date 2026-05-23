import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const AuroraBg: React.FC = () => {
  const frame = useCurrentFrame();
  const x1 = interpolate(frame, [0, 300], [-10, 15], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const y1 = interpolate(frame, [0, 300], [5, -10], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const x2 = interpolate(frame, [0, 250], [10, -10], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const y2 = interpolate(frame, [0, 250], [-5, 10], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#000", zIndex: 0 }}>
      <div style={{
        position: "absolute", width: 600, height: 600,
        top: `calc(20% + ${y1 * 3}px)`, left: `calc(10% + ${x1 * 3}px)`,
        background: "radial-gradient(circle, rgba(66,133,244,0.25), transparent 70%)",
        filter: "blur(100px)", borderRadius: "50%",
      }} />
      <div style={{
        position: "absolute", width: 500, height: 500,
        top: `calc(50% + ${y2 * 3}px)`, left: `calc(60% + ${x2 * 3}px)`,
        background: "radial-gradient(circle, rgba(234,67,53,0.15), transparent 70%)",
        filter: "blur(80px)", borderRadius: "50%",
      }} />
      <div style={{
        position: "absolute", width: 400, height: 400,
        top: "70%", left: "30%",
        background: "radial-gradient(circle, rgba(52,168,83,0.12), transparent 70%)",
        filter: "blur(70px)", borderRadius: "50%",
      }} />
    </AbsoluteFill>
  );
};
