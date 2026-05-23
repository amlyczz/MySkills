import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface Props { text: string; startFrame?: number; charsPerFrame?: number; }

export const PromptInput: React.FC<Props> = ({ text, startFrame = 0, charsPerFrame = 3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - startFrame);
  const charsToShow = Math.min(text.length, Math.floor(elapsed / charsPerFrame));
  const displayText = text.slice(0, charsToShow);
  const showCursor = ((Math.floor(frame / 15) % 2) === 0) && charsToShow < text.length;

  const scl = interpolate(elapsed, [0, 20], [0.8, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(elapsed, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      transform: `scale(${scl})`, opacity,
      backgroundColor: "#FFFFFF", borderRadius: 999,
      padding: "16px 24px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      width: 600, fontFamily: "Inter, sans-serif", fontSize: 24,
      fontWeight: 500, color: "#1D1D1F",
    }}>
      <span>
        {displayText}
        {showCursor && <span style={{ borderRight: "2px solid #000", height: 24, marginLeft: 2, display: "inline-block", verticalAlign: "middle" }} />}
      </span>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        backgroundColor: charsToShow === text.length ? "#1D1D1F" : "#E5E5EA",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginLeft: 16, flexShrink: 0,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={charsToShow === text.length ? "#FFF" : "#000"} strokeWidth="2">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </div>
    </div>
  );
};
