import React from "react";
import { useCurrentFrame } from "remotion";

interface Props {
  text: string;
  startFrame: number;
  charsPerFrame?: number;
  showCursor?: boolean;
  className?: string;
}

export const Typewriter: React.FC<Props> = ({
  text,
  startFrame,
  charsPerFrame = 2,
  showCursor = true,
  className,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const visibleChars = Math.min(text.length, Math.floor(elapsed / charsPerFrame));
  const displayText = text.slice(0, visibleChars);
  const isTyping = visibleChars < text.length;

  const cursorBlink = Math.sin(frame * 0.2) > 0;

  return (
    <span className={className}>
      {displayText}
      {showCursor && isTyping && (
        <span className={`font-light ${cursorBlink ? "opacity-100" : "opacity-0"}`}>|</span>
      )}
    </span>
  );
};
