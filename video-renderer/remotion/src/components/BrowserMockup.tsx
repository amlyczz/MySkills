import React, { type ReactNode } from "react";

interface Props { children: ReactNode; style?: React.CSSProperties; showTrafficLights?: boolean; }

export const BrowserMockup: React.FC<Props> = ({ children, style, showTrafficLights = true }) => (
  <div style={{
    width: 1200, height: 780,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    border: "1px solid #E5E7EB",
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    overflow: "hidden",
    position: "relative",
    ...style,
  }}>
    {showTrafficLights && (
      <div style={{
        height: 40, borderBottom: "1px solid #F0F0F0",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 8,
      }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }} />
      </div>
    )}
    <div style={{ padding: 24, height: showTrafficLights ? "calc(100% - 40px)" : "100%", overflow: "hidden" }}>
      {children}
    </div>
  </div>
);
