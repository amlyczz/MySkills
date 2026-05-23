import React, { type ReactNode } from "react";
import { AbsoluteFill } from "remotion";

export const QuadLayout: React.FC<{ children: ReactNode[] }> = ({ children }) => (
  <AbsoluteFill style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" }}>
    {children.slice(0, 4).map((child, i) => (
      <div key={i} style={{ overflow: "hidden", position: "relative", border: "1px solid rgba(0,0,0,0.05)" }}>
        {child}
      </div>
    ))}
  </AbsoluteFill>
);
