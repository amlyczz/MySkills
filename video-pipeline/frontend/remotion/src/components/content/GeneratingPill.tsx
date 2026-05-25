import React from "react";
import { useCurrentFrame } from "remotion";

/**
 * GeneratingPill — a small badge showing "Generating..." with a spinning indicator.
 * Micro-animation (spinner) driven by useCurrentFrame, no CSS keyframes.
 * No entrance animation (handled by ElementRenderer/animationRegistry).
 */
export const GeneratingPill: React.FC = () => {
  const frame = useCurrentFrame();
  const rotation = frame * 6; // 6 degrees per frame = 1 full rotation every 60 frames

  return (
    <div className="bg-black text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2 font-sans absolute -top-4 left-5">
      <div
        className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
      Generating...
    </div>
  );
};
