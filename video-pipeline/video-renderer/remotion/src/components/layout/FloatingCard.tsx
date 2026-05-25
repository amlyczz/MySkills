import React, { type ReactNode } from "react";
import { useCurrentFrame } from "remotion";

interface Props {
  children: ReactNode; delay?: number;
  rotX?: number; rotY?: number; scale?: number;
  zIdx?: number; glow?: boolean;
  className?: string;
}

export const FloatingCard: React.FC<Props> = ({ children, delay = 0, rotX = 0, rotY = 0, scale = 1, zIdx = 1, glow = false, className = "" }) => {
  const frame = useCurrentFrame();
  const floatY = Math.sin((frame + delay) * 0.02) * 8;

  return (
    <div 
      className={`rounded-2xl overflow-hidden ${glow ? "shadow-[0_0_30px_rgba(66,133,244,0.4)]" : "shadow-[0_20px_50px_rgba(0,0,0,0.5)]"} ${className}`}
      style={{
        transform: `perspective(1000px) scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(${floatY}px)`,
        zIndex: zIdx,
      }}
    >
      {children}
    </div>
  );
};
