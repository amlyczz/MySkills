import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

type Preset = "fadeUp" | "scale" | "typewriter";

interface Props {
  text: string;
  preset?: Preset;
  delayFrames?: number;
  style?: React.CSSProperties;
  highlightWord?: string;
}

export const AnimatedText: React.FC<Props> = ({ text, preset = "fadeUp", delayFrames = 0, style, highlightWord }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - delayFrames);

  if (preset === "typewriter") {
    const chars = Math.min(text.length, Math.floor(elapsed / 2));
    const cursor = Math.sin(elapsed * 0.25) > 0 && chars < text.length;
    return <span style={style}>{text.slice(0, chars)}{cursor && "|"}</span>;
  }

  if (preset === "scale") {
    const s = spring({ frame: elapsed, fps, config: { damping: 14, stiffness: 100 } });
    return <div style={{ opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.95, 1])})`, ...style }}>{text}</div>;
  }

  // fadeUp
  const s = spring({ frame: elapsed, fps, config: { damping: 14, stiffness: 100, mass: 1 } });
  const y = interpolate(s, [0, 1], [30, 0]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  const parts = highlightWord ? text.split(highlightWord) : [text];

  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, ...style }}>
      {parts.length === 1 ? text : (
        <>
          {parts[0]}<span style={{ color: "#007AFF" }}>{highlightWord}</span>{parts[1]}
        </>
      )}
    </div>
  );
};
