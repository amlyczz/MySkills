import React, { type ReactNode } from "react";

interface Props {
  type?: "chat" | "upload" | "code";
  children: ReactNode;
  className?: string;
}

export const UICard: React.FC<Props> = ({ type, children, className }) => (
  <div
    className={`rounded-[20px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-black/5 font-sans w-full max-w-[600px] ${
      type === "code"
        ? "bg-[#1E1E2E] text-[#CDD6F4] font-mono"
        : "bg-white"
    } ${className || ""}`}
  >
    {type === "chat" && (
      <div className="flex gap-2 mb-3 items-center">
        <div className="w-2 h-2 rounded-full bg-[#34C759]" />
        <span className="text-xs text-[#86868B]">Assistant</span>
      </div>
    )}
    {type === "code" && (
      <div className="flex gap-2 mb-3 items-center">
        <span className="text-xs text-[#585B70]">$ command-a eval</span>
      </div>
    )}
    {children}
  </div>
);
