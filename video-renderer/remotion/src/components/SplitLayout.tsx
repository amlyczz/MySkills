import React, { type ReactNode } from "react";
import { AbsoluteFill } from "remotion";

export const SplitLayout: React.FC<{ left: ReactNode; right: ReactNode; leftRatio?: number }> = ({ left, right, leftRatio = 0.4 }) => (
  <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", padding: "0 8%" }}>
    <div style={{ width: `${leftRatio * 100}%`, paddingRight: 40 }}>{left}</div>
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{right}</div>
  </AbsoluteFill>
);
