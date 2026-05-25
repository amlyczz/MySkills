import React from "react";
import { useCurrentFrame } from "remotion";

interface Props { text: string; startFrame?: number; charsPerFrame?: number; className?: string; }

export const PromptInput: React.FC<Props> = ({ text, startFrame = 0, charsPerFrame = 3, className = "" }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charsToShow = Math.min(text.length, Math.floor(elapsed / charsPerFrame));
  const displayText = text.slice(0, charsToShow);
  const showCursor = ((Math.floor(frame / 15) % 2) === 0) && charsToShow < text.length;

  return (
    <div className={`bg-white rounded-full px-6 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.1)] flex items-center justify-between w-full max-w-[600px] font-sans text-2xl font-medium text-[#1D1D1F] ${className}`}>
      <span>
        {displayText}
        {showCursor && <span className="border-r-2 border-black h-6 ml-0.5 inline-block align-middle" />}
      </span>
      <div 
        className={`w-10 h-10 rounded-full flex items-center justify-center ml-4 shrink-0 ${charsToShow === text.length ? "bg-[#1D1D1F]" : "bg-[#E5E5EA]"}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={charsToShow === text.length ? "#FFF" : "#000"} strokeWidth="2">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </div>
    </div>
  );
};
