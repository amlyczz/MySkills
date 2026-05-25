import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const AuroraBg: React.FC = () => {
  const frame = useCurrentFrame();
  const x1 = interpolate(frame, [0, 300], [-10, 15], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const y1 = interpolate(frame, [0, 300], [5, -10], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const x2 = interpolate(frame, [0, 250], [10, -10], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const y2 = interpolate(frame, [0, 250], [-5, 10], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill className="bg-black !z-0">
      <div
        className="absolute w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(66,133,244,0.25),transparent_70%)] blur-[100px] rounded-full"
        style={{ top: `calc(20% + ${y1 * 3}px)`, left: `calc(10% + ${x1 * 3}px)` }}
      />
      <div
        className="absolute w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(234,67,53,0.15),transparent_70%)] blur-[80px] rounded-full"
        style={{ top: `calc(50% + ${y2 * 3}px)`, left: `calc(60% + ${x2 * 3}px)` }}
      />
      <div 
        className="absolute w-[400px] h-[400px] top-[70%] left-[30%] bg-[radial-gradient(circle,rgba(52,168,83,0.12),transparent_70%)] blur-[70px] rounded-full"
      />
    </AbsoluteFill>
  );
};
