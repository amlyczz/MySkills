import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface Props {
  text: string;
  startFrame: number;
  charsPerFrame?: number;
  showCursor?: boolean;
  style?: React.CSSProperties;
}

export const Typewriter: React.FC<Props> = ({
  text,
  startFrame,
  charsPerFrame = 2,
  showCursor = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - startFrame);
  const visibleChars = Math.min(text.length, Math.floor(elapsed / charsPerFrame));
  const displayText = text.slice(0, visibleChars);
  const isTyping = visibleChars < text.length;

  const cursorBlink = Math.sin(frame * 0.2) > 0;

  return (
    <span style={style}>
      {displayText}
      {showCursor && isTyping && (
        <span style={{ opacity: cursorBlink ? 1 : 0, fontWeight: 300 }}>|</span>
      )}
    </span>
  );
};
