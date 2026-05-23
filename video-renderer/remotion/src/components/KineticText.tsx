import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface Props {
  text: string;
  style?: React.CSSProperties;
  outlined?: boolean;
  delay?: number;
}

export const KineticText: React.FC<Props> = ({ text, style, outlined = false, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - delay);
  const s = spring({ frame: elapsed, fps, config: { damping: 12, stiffness: 100 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const translateY = interpolate(s, [0, 1], [50, 0]);

  return (
    <div style={{
      fontSize: 120, fontWeight: 900,
      fontFamily: "Inter, sans-serif",
      color: outlined ? "transparent" : "#fff",
      WebkitTextStroke: outlined ? "2px #fff" : "none",
      opacity,
      transform: `translateY(${translateY}px)`,
      lineHeight: 0.9,
      ...style,
    }}>
      {text}
    </div>
  );
};
