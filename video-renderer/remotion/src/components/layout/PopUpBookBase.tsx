import React, { type ReactNode } from "react";

interface Props { children: ReactNode; className?: string; }

export const PopUpBookBase: React.FC<Props> = ({ children, className = "" }) => {
  return (
    <div className={`w-[1200px] h-[400px] bg-[#F4F4F0] rounded-t-xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] border-t-4 border-black flex justify-center items-end relative [perspective:1000px] ${className}`}>
      <div 
        className="absolute inset-0 opacity-[0.03] bg-cover pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="[transform-style:preserve-3d] w-full h-full">
        {children}
      </div>
    </div>
  );
};
