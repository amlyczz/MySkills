import React, { type ReactNode } from "react";

interface Props { children: ReactNode; className?: string; showTrafficLights?: boolean; }

export const BrowserMockup: React.FC<Props> = ({ children, className = "", showTrafficLights = true }) => (
  <div className={`relative flex flex-col w-full h-full bg-[var(--color-surface,#FFF)] rounded-2xl border border-[var(--color-border,#E5E5E5)] shadow-[var(--shadow-lg,0_25px_50px_rgba(0,0,0,0.15))] overflow-hidden ${className}`}>
    {showTrafficLights && (
      <div className="flex items-center shrink-0 h-10 px-4 gap-2 border-b border-[var(--color-border,#E5E5E5)]">
        <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
        <div className="w-3 h-3 rounded-full bg-[#28C840]" />
      </div>
    )}
    <div className="flex-1 p-6 overflow-hidden">
      {children}
    </div>
  </div>
);
