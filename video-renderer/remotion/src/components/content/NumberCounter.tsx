import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface Props {
  value: number;
  startFrame?: number;
  durationFrames?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const NumberCounter: React.FC<Props> = ({
  value,
  startFrame = 0,
  durationFrames = 60,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - startFrame, [0, durationFrames], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div className={`font-sans font-extrabold text-[var(--color-primary,#4285F4)] tracking-tight ${className || ""}`}>
      {prefix}{p.toFixed(decimals)}{suffix}
    </div>
  );
};
