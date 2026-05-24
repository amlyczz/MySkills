import React, { type ReactNode } from "react";

interface Props { children?: ReactNode; className?: string; blur?: number; opacity?: number; }

export const GlassPanel: React.FC<Props> = ({ children, className, blur = 20, opacity = 0.15 }) => (
  <div className={`rounded-[var(--radius-xl,24px)] border border-white/10 ${className || ""}`} style={{
    background: `rgba(255,255,255,${opacity})`,
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
  }}>
    {children}
  </div>
);
