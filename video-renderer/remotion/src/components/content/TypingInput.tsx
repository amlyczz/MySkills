import React from "react";
import { useCurrentFrame } from "remotion";

interface Props {
  text: string;
  startFrame: number;
}

/**
 * TypingInput — Dumb-ish component with internal typewriter micro-animation.
 * No entrance animation (handled by ElementRenderer/animationRegistry).
 */
export const TypingInput: React.FC<Props> = ({ text, startFrame }) => {
  const frame = useCurrentFrame();
  const chars = Math.min(text.length, Math.floor(Math.max(0, frame - startFrame) / 2));
  const done = chars >= text.length;
  return (
    <div className="bg-white rounded-2xl px-6 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-center w-[80%] mx-auto font-sans">
      <span className="text-lg text-[#111] flex-1">
        {text.slice(0, chars)}
        {chars < text.length && (
          <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0 }}>|</span>
        )}
      </span>
      {done && (
        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-base">↑</div>
      )}
    </div>
  );
};
