import React, { type ReactNode } from "react";

interface Props {
  type?: "chat" | "code" | "upload";
  children: ReactNode;
  className?: string;
  /** Shadow depth level (1-3). Uses filter: drop-shadow() to avoid Chromium box-shadow perf trap */
  elevation?: number;
}

const getElevation = (e: number) => {
  if (e === 1) return "drop-shadow-sm";
  if (e === 3) return "drop-shadow-xl";
  return "drop-shadow-md";
};

export const MockUICard: React.FC<Props> = ({
  type,
  children,
  className = "",
  elevation = 2,
}) => (
  <div
    className={`rounded-lg p-6 border border-slate-200 w-full max-w-[600px] ${getElevation(elevation)} ${
      type === "code"
        ? "bg-[#1E1E2E] text-[#CDD6F4] font-mono"
        : "bg-white text-slate-900 font-sans"
    } ${className}`}
  >
    {type === "chat" && (
      <div className="flex gap-2 mb-3 items-center">
        <div className="w-2 h-2 rounded bg-[#34C759]" />
        <span className="text-xs text-[#86868B]">Assistant</span>
      </div>
    )}
    {type === "code" && (
      <div className="flex gap-2 mb-3">
        <span className="text-xs text-[#585B70]">$ command-a eval</span>
      </div>
    )}
    {children}
  </div>
);
