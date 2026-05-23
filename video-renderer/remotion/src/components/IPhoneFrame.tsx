import React, { type ReactNode } from "react";

interface Props { children: ReactNode; style?: React.CSSProperties; }

export const IPhoneFrame: React.FC<Props> = ({ children, style }) => (
  <div style={{
    width: 360, minHeight: 760,
    background: "#FFFFFF",
    borderRadius: 48,
    border: "8px solid #1A1A1A",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
    overflow: "hidden",
    position: "relative",
    fontFamily: "Inter, -apple-system, sans-serif",
    flexShrink: 0,
    ...style,
  }}>
    {/* Dynamic Island */}
    <div style={{
      position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
      width: 120, height: 30, borderRadius: 20,
      background: "#1A1A1A", zIndex: 10,
    }} />
    {children}
  </div>
);
