import React from "react";
import { colors } from "../theme/tokens";

interface Props {
  icon?: string;
  name: string;
  style?: React.CSSProperties;
}

export const FileCard: React.FC<Props> = ({ icon = "📄", name, style }) => (
  <div style={{
    width: 120, height: 140,
    background: colors.cardBg,
    borderRadius: 12,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    border: `1px solid ${colors.cardBorder}`,
    gap: 8,
    fontFamily: "Inter, sans-serif",
    ...style,
  }}>
    <div style={{ fontSize: 32, filter: "drop-shadow(0 0 8px rgba(0,245,212,0.3))" }}>{icon}</div>
    <span style={{ fontSize: 11, textAlign: "center", padding: "0 8px", color: colors.textDim, lineHeight: 1.3 }}>{name}</span>
  </div>
);
