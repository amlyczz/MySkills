import React, { type ReactNode } from "react";
import { colors, radii, glow } from "../theme/tokens";

interface Props {
  children: ReactNode;
  style?: React.CSSProperties;
  glowIntensity?: number;
}

export const GlowPanel: React.FC<Props> = ({ children, style, glowIntensity = 1 }) => (
  <div style={{
    position: "relative",
    background: colors.panel,
    backdropFilter: "blur(24px)",
    border: `1px solid ${colors.panelBorder}`,
    borderRadius: radii.lg,
    padding: 24,
    boxShadow: glow.panel(glowIntensity),
    overflow: "hidden",
    ...style,
  }}>
    <div style={{
      position: "absolute", inset: 0, borderRadius: radii.lg,
      background: `linear-gradient(180deg, rgba(0,245,212,0.05) 0%, transparent 40%)`,
      pointerEvents: "none",
      zIndex: 0,
    }} />
    <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
  </div>
);
