import React from "react";
import type { ReactNode } from "react";

export const NoiseBackground: React.FC<{
  children?: ReactNode;
  opacity?: number;
  className?: string;
}> = ({ children, opacity = 0.04, className = "" }) => (
  <div className={`w-full h-full relative bg-[#F5F5F7] ${className}`}>
    <div 
      className="absolute inset-0 pointer-events-none mix-blend-multiply bg-[length:256px_256px] bg-repeat"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity,
      }}
    />
    {children}
  </div>
);
