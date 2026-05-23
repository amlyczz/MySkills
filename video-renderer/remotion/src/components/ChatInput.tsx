import React from "react";
import { colors } from "../theme/tokens";

interface Props {
  value: string;
  style?: React.CSSProperties;
}

export const ChatInput: React.FC<Props> = ({ value, style }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    background: "rgba(0, 245, 212, 0.08)",
    border: "1px solid rgba(0, 245, 212, 0.4)",
    borderRadius: 999,
    padding: "12px 20px",
    color: colors.text,
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    letterSpacing: "0.02em",
    maxWidth: 600,
    width: "100%",
    ...style,
  }}>
    <span style={{ flex: 1 }}>{value}</span>
    <span style={{ opacity: 0.7, fontSize: 18 }}>🎙️</span>
  </div>
);
