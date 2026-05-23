import React, { type ReactNode } from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props { children: ReactNode; startFrame?: number; }

export const PopUpBookBase: React.FC<Props> = ({ children, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - startFrame, [0, 25], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const y = interpolate(progress, [0, 1], [60, 0]);
  const opacity = Math.min(1, progress * 2);

  return (
    <div style={{
      position: "absolute", bottom: 80, left: "50%",
      transform: `translateX(-50%) translateY(${y}px)`,
      width: 1200, height: 400,
      background: "#F4F4F0",
      borderRadius: "12px 12px 0 0",
      boxShadow: "0 -10px 40px rgba(0,0,0,0.08)",
      borderTop: "4px solid #000",
      display: "flex", justifyContent: "center", alignItems: "flex-end",
      perspective: 1000,
      opacity,
    }}>
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E")`,
        backgroundSize: "cover",
        pointerEvents: "none",
      }} />
      <div style={{ transformStyle: "preserve-3d", width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
};
