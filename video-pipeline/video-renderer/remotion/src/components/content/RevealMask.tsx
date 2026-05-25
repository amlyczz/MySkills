import React, { type ReactNode } from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface Props { children?: ReactNode; direction?: "left" | "right" | "up" | "down"; durationFrames?: number; delayFrames?: number; className?: string; }

export const RevealMask: React.FC<Props> = ({
  children, direction = "right", durationFrames = 45, delayFrames = 0, className,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delayFrames, [0, durationFrames], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  const clipMap: Record<string, string> = {
    right: `inset(0 ${100 - p}% 0 0)`,
    left: `inset(0 0 0 ${100 - p}%)`,
    up: `inset(${100 - p}% 0 0 0)`,
    down: `inset(0 0 ${100 - p}% 0)`,
  };

  return (
    <div className={className} style={{ clipPath: clipMap[direction] }}>
      {children}
    </div>
  );
};
