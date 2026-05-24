import React from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export const MinimalCard: React.FC<Props> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-[20px] px-6 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-black/5 text-base font-sans text-[#111] inline-flex items-center ${className}`}>
    {children}
  </div>
);
