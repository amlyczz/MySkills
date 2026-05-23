import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  title: string; desc: string; icon: string;
  delay?: number;
  style?: React.CSSProperties;
}

export const SkillCard: React.FC<Props> = ({ title, desc, icon, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const scale = interpolate(frame - delay, [0, 20], [0.8, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div style={{
      width: 300, padding: 20, backgroundColor: "#FFFFFF",
      borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      opacity, transform: `scale(${scale})`,
      display: "flex", flexDirection: "column", gap: 10,
      fontFamily: "Inter, sans-serif",
      ...style,
    }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: "#0F0F0F" }}>{title}</div>
      <div style={{ fontSize: 14, color: "#666", lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
};
