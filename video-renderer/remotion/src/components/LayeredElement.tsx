import React, { type ReactNode } from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface Props { children: ReactNode; depth?: number; delay?: number; startFrame?: number; }

export const LayeredElement: React.FC<Props> = ({ children, depth = 0, delay = 0, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - startFrame - delay);
  const s = spring({ frame: elapsed, fps, config: { stiffness: 80, damping: 15, mass: 1 } });
  const translateY = interpolate(s, [0, 1], [60 + depth * 20, 0]);
  const scale = 0.95 + s * 0.05;
  const opacity = Math.min(1, s * 2);

  return (
    <div style={{
      position: "absolute",
      transform: `translateY(${translateY}px) scale(${scale})`,
      opacity,
      willChange: "transform, opacity",
    }}>
      {children}
    </div>
  );
};
