import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const themes: Record<string, { bg: string; accent: string }> = {
  blue: { bg: "#0A192F", accent: "#4ECDC4" },
  red: { bg: "#0A192F", accent: "#FF6B6B" },
  yellow: { bg: "#0A192F", accent: "#FFE66D" },
  purple: { bg: "#0A192F", accent: "#6C5CE7" },
};

export const MemphisCard: React.FC<{ name: string; role: string; text: string; theme?: string; delay?: number; style?: React.CSSProperties }> =
({ name, role, text, theme = "blue", delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = themes[theme];
  const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 15, stiffness: 100 } });

  return (
    <div style={{
      width: 380, minHeight: 280, backgroundColor: t.bg, borderRadius: 32, padding: 40,
      position: "relative", overflow: "hidden",
      transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
      opacity: s, ...style,
    }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 150, height: 150, background: t.accent, borderRadius: "50%", opacity: 0.15 }} />
      <div style={{ position: "absolute", bottom: 30, left: 20, width: 60, height: 8, background: t.accent, borderRadius: 4 }} />
      <div style={{ position: "absolute", top: 50, left: 50, width: 20, height: 20, border: `3px solid ${t.accent}`, borderRadius: "50%" }} />
      <div style={{ position: "relative", zIndex: 1, fontFamily: "Inter, sans-serif", color: "#FFF" }}>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>What Our Customers Say</h3>
        <div style={{ fontSize: 15, lineHeight: 1.5, opacity: 0.9 }}>"{text}"</div>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#333" }} />
          <div><div style={{ fontWeight: 700 }}>{name}</div><div style={{ color: t.accent, fontSize: 13 }}>{role}</div></div>
        </div>
      </div>
    </div>
  );
};
