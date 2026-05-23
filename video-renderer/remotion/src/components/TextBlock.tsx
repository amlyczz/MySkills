import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  en: string; jp?: string; color?: string;
  x?: number; y?: number; startFrame?: number;
  style?: React.CSSProperties;
}

export const TextBlock: React.FC<Props> = ({
  en, jp, color = "#FF3399", x = 100, y = 100, startFrame = 0, style,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - startFrame, [0, 15], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const ty = interpolate(progress, [0, 1], [20, 0]);

  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `translateY(${ty}px)`,
      opacity: progress, zIndex: 10,
      fontFamily: "Inter, 'Noto Sans JP', sans-serif",
      ...style,
    }}>
      <div style={{
        background: color, color: "#000", padding: "6px 14px",
        fontWeight: 800, fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.02em",
        display: "inline-block",
      }}>
        {en}
      </div>
      {jp && (
        <div style={{
          background: "#fff", color: "#000", padding: "4px 10px", marginTop: 4,
          fontSize: 16, fontWeight: 500, display: "inline-block",
        }}>
          {jp}
        </div>
      )}
    </div>
  );
};
