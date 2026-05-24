import React, { type ReactNode } from "react";

/**
 * CenterLayout — per spec:
 *   display: flex; justify-content: center; align-items: center; max-width: 1152px (60vw)
 */
export const CenterLayout: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`flex items-center justify-center w-full h-full max-w-[1152px] mx-auto ${className}`}>
    {children}
  </div>
);
