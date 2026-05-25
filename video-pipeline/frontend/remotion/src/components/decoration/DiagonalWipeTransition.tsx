import React from "react";

interface Props { color: string; progress?: number; }

export const DiagonalWipeTransition: React.FC<Props> = ({ color, progress = 1 }) => {
  return (
    <div 
      className="absolute inset-0 z-[999] pointer-events-none" 
      style={{
        backgroundColor: color,
        clipPath: `polygon(0 0, ${progress * 250}% 0, 0 ${progress * 250}%)`,
      }} 
    />
  );
};
