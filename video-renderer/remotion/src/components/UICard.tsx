import React, { type ReactNode } from "react";

interface Props {
  type?: "chat" | "upload" | "code";
  children: ReactNode;
  style?: React.CSSProperties;
}

export const UICard: React.FC<Props> = ({ type, children, style }) => (
  <div style={{
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24,
    boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.06)",
    fontFamily: "Inter, sans-serif", maxWidth: 600,
    ...(type === "code" ? { background: "#1E1E2E", color: "#CDD6F4", fontFamily: "'JetBrains Mono', monospace" } : {}),
    ...style,
  }}>
    {type === "chat" && <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: "#34C759" }} /><span style={{ fontSize: 12, color: "#86868B" }}>Assistant</span></div>}
    {type === "code" && <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 12, color: "#585B70" }}>$ command-a eval</span></div>}
    {children}
  </div>
);
