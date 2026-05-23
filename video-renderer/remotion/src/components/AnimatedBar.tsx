import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface BarProps {
  label: string; endValue: number; maxValue: number;
  isHighlight?: boolean; delay?: number;
}

export const AnimatedBar: React.FC<BarProps> = ({ label, endValue, maxValue, isHighlight, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 16, stiffness: 100, mass: 1 } });
  const barWidth = progress * (endValue / maxValue) * 100;
  const currentNumber = Math.round(progress * endValue);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40, fontFamily: "Inter, sans-serif", width: 800, marginBottom: 24 }}>
      <div style={{ width: 200, fontSize: 24, color: "#000", textAlign: "right", fontWeight: 500 }}>{label}</div>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <div style={{
          width: `${barWidth}%`, minWidth: 60, height: 64,
          backgroundColor: isHighlight ? "#FF4500" : "rgba(0,0,0,0.08)",
          borderRadius: 32, display: "flex", justifyContent: "flex-end", alignItems: "center",
          paddingRight: 24,
          boxShadow: isHighlight ? "0 10px 30px rgba(255,69,0,0.3)" : "none",
          backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)",
        }}>
          <span style={{ color: isHighlight ? "#FFF" : "#000", fontSize: 28, fontWeight: 600 }}>{currentNumber}%</span>
        </div>
      </div>
    </div>
  );
};
