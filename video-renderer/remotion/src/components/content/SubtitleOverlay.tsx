import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { SubtitleToken } from "../../engine/types";

interface Props {
  tokens: SubtitleToken[];
  highlightColor?: string;
  fontSize?: number;
}

/**
 * SubtitleOverlay — renders word-level highlighted captions.
 * Each token has fromFrame/toFrame (relative to scene start).
 * The currently active word is highlighted; inactive words are dimmed.
 */
export const SubtitleOverlay: React.FC<Props> = ({
  tokens,
  highlightColor = "#39E508",
  fontSize = 64,
}) => {
  const frame = useCurrentFrame();

  if (!tokens || tokens.length === 0) return null;

  // Only show tokens whose time window contains the current frame
  const visibleTokens = tokens.filter(
    (t) => frame >= t.fromFrame && frame < t.toFrame
  );
  if (visibleTokens.length === 0) return null;

  // Determine which token is "active" (spoken right now)
  const activeIdx = Math.max(
    0,
    tokens.findIndex((t) => frame >= t.fromFrame && frame < t.toFrame)
  );

  return (
    <AbsoluteFill
      className="pointer-events-none select-none"
      style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}
    >
      <div
        className="text-center px-16 font-sans font-bold"
        style={{
          fontSize,
          lineHeight: 1.4,
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          maxWidth: "90%",
          whiteSpace: "pre-wrap",
        }}
      >
        {tokens.map((token, i) => {
          const isVisible = frame >= token.fromFrame && frame < token.toFrame;
          if (!isVisible) return null;

          const isActive = i === activeIdx;
          return (
            <span
              key={i}
              style={{
                color: isActive ? highlightColor : "rgba(255,255,255,0.7)",
              }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
