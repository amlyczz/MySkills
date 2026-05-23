import React from "react";
import type { ReactNode } from "react";

const BG_COLOR = "#F5F5F7";

export const NoiseBackground: React.FC<{
  children?: ReactNode;
  opacity?: number;
}> = ({ children, opacity = 0.04 }) => (
  <div style={{
    backgroundColor: BG_COLOR,
    width: "100%", height: "100%",
    position: "relative",
  }}>
    <div style={{
      position: "absolute", inset: 0,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: "256px 256px",
      backgroundRepeat: "repeat",
      opacity,
      pointerEvents: "none",
      mixBlendMode: "multiply",
    }} />
    {children}
  </div>
);
