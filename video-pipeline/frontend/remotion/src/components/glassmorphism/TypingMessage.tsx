import React from "react";
import { useCurrentFrame } from "remotion";

interface Props {
  content: string;
  typingSpeed?: number; // frames per character
  delay?: number;
  avatar?: string;
  sender?: string;
  bubbleColor?: string;
  textColor?: string;
  fontSize?: number;
  maxWidth?: number;
}

export const TypingMessage: React.FC<Props> = ({
  content,
  typingSpeed = 2,
  delay = 0,
  avatar = "AI",
  sender = "Assistant",
  bubbleColor = "rgba(255,255,255,0.08)",
  textColor = "#FFFFFF",
  fontSize = 18,
  maxWidth = 460,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delay);
  const visibleChars = Math.min(Math.floor(elapsed / typingSpeed), content.length);
  const displayText = content.slice(0, visibleChars);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      {/* Avatar */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: "linear-gradient(135deg, #0D3B8E, #4A7BF7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}>
        {avatar}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth,
        padding: "14px 18px",
        borderRadius: "0 16px 16px 16px",
        background: bubbleColor,
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          fontWeight: 600,
          marginBottom: 6,
          fontFamily: "'Inter', sans-serif",
        }}>
          {sender}
        </div>
        <div style={{
          fontSize,
          color: textColor,
          lineHeight: 1.6,
          fontFamily: "'Inter', sans-serif",
        }}>
          {displayText}
          {visibleChars < content.length && (
            <span style={{
              display: "inline-block",
              width: 2,
              height: fontSize,
              background: textColor,
              marginLeft: 2,
              animation: "blink 0.8s infinite",
            }} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
};
