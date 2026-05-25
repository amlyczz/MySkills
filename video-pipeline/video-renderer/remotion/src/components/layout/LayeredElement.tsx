import React, { type ReactNode } from "react";

interface Props { children: ReactNode; depth?: number; delay?: number; startFrame?: number; className?: string; }

export const LayeredElement: React.FC<Props> = ({ children, className = "" }) => {
  return (
    <div className={`relative ${className}`}>
      {children}
    </div>
  );
};
