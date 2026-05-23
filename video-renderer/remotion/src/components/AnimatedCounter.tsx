import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  target: number; prefix?: string; suffix?: string;
  durationFrames?: number; style?: React.CSSProperties;
}

export const AnimatedCounter: React.FC<Props> = ({
  target, prefix = "$", suffix = "", durationFrames = 60, style,
}) => {
  const frame = useCurrentFrame();
  const val = interpolate(frame, [0, durationFrames], [0, target], { extrapolateRight: "clamp" });
  return (
    <div style={{
      fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 64, color: "#111",
      ...style,
    }}>
      {prefix}{Math.floor(val).toLocaleString()}{suffix}
    </div>
  );
};
