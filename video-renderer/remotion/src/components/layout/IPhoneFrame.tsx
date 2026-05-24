import React, { type ReactNode } from "react";

interface Props { children: ReactNode; className?: string; }

export const IPhoneFrame: React.FC<Props> = ({ children, className = "" }) => (
  <div className={`w-[360px] min-h-[760px] bg-[var(--color-surface,#FFF)] rounded-[48px] border-[8px] border-[var(--color-border,#1A1A1A)] shadow-[var(--shadow-lg,0_25px_50px_-12px_rgba(0,0,0,0.15))] overflow-hidden relative font-['Inter',-apple-system,sans-serif] shrink-0 ${className}`}>
    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[120px] h-[30px] rounded-[20px] bg-[var(--color-border,#1A1A1A)] z-10" />
    {children}
  </div>
);
