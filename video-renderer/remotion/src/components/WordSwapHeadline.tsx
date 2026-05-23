import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface Props {
  prefix: string;
  words: string[];
  framePerWord?: number;
  style?: React.CSSProperties;
}

export const WordSwapHeadline: React.FC<Props> = ({ prefix, words, framePerWord = 45, style }) => {
  const frame = useCurrentFrame();
  const wordIndex = Math.floor(frame / framePerWord) % words.length;
  const nextWordIndex = (wordIndex + 1) % words.length;
  const localFrame = frame % framePerWord;

  const fadeProgress = interpolate(localFrame, [0, 15, framePerWord - 10, framePerWord], [0, 1, 1, 0], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  return (
    <div style={{
      fontSize: 64, fontWeight: 500, textAlign: "center", color: "#111",
      fontFamily: "Inter, sans-serif", letterSpacing: "0.01em",
      display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", gap: "0.3em",
      ...style,
    }}>
      <span>{prefix}</span>
      <span style={{ display: "inline-block", position: "relative", minWidth: 400, textAlign: "left" }}>
        <span style={{
          opacity: 1 - fadeProgress,
          transform: `translateY(${interpolate(fadeProgress, [0, 1], [0, -20])}px)`,
          position: "absolute", top: 0, left: 0, whiteSpace: "nowrap",
        }}>
          {words[wordIndex]}
        </span>
        <span style={{
          opacity: fadeProgress,
          transform: `translateY(${interpolate(fadeProgress, [0, 1], [20, 0])}px)`,
          whiteSpace: "nowrap",
        }}>
          {words[nextWordIndex]}
        </span>
      </span>
    </div>
  );
};
