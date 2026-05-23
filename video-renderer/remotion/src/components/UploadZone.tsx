import React from "react";
import { colors, radii } from "../theme/tokens";

export const UploadZone: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{
    border: `2px dashed rgba(0, 245, 212, 0.4)`,
    borderRadius: radii.md,
    padding: 32,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    color: colors.textDim,
    fontFamily: "Inter, sans-serif",
    letterSpacing: "0.02em",
    ...style,
  }}>
    <div style={{ display: "flex", gap: 8, fontSize: 28, opacity: 0.7 }}>+</div>
    <span style={{ fontSize: 14 }}>Upload or drop files here</span>
  </div>
);
