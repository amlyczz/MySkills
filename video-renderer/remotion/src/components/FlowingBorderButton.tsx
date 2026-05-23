import React from "react";
import { AbsoluteFill } from "remotion";

interface Props {
  text?: string; subText?: string;
  gradientColors?: string[]; speed?: number;
  width?: number; height?: number; radius?: number;
  fontSize?: number; shadowOpacity?: number;
}

export const FlowingBorderButton: React.FC<Props> = ({
  text = "Elements", subText = "PORTFOLIO",
  gradientColors = ["#FF0000", "#00FF00", "#0000FF", "#FF00FF", "#FFFF00"],
  speed = 4, width = 320, height = 80, radius = 40,
  fontSize = 32, shadowOpacity = 0.15,
}) => {
  const gradientStr = `linear-gradient(45deg, ${gradientColors.join(", ")})`;

  return (
    <AbsoluteFill style={{
      backgroundColor: "#E5E7EB", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        position: "relative", width, height, borderRadius: radius,
        padding: 3, background: gradientStr,
        animation: `rotate ${speed}s linear infinite`,
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: radius - 3,
          backgroundColor: "#FFFFFF",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 8px 32px rgba(0,0,0,${shadowOpacity})`,
        }}>
          <span style={{ fontSize, fontWeight: 600, color: "#111827" }}>{text}</span>
        </div>
      </div>
      {subText && (
        <span style={{ fontSize: 16, fontWeight: 500, color: "#9CA3AF", letterSpacing: 4, textTransform: "uppercase" }}>
          {subText}
        </span>
      )}
      <style>{`@keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </AbsoluteFill>
  );
};
