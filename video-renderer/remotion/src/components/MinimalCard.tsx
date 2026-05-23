import React from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  style?: React.CSSProperties;
}

export const MinimalCard: React.FC<Props> = ({ children, style }) => (
  <div style={{
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: "16px 24px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
    border: "1px solid rgba(0,0,0,0.05)",
    fontSize: 16,
    fontFamily: "Inter, sans-serif",
    color: "#111",
    display: "inline-flex",
    alignItems: "center",
    ...style,
  }}>
    {children}
  </div>
);
