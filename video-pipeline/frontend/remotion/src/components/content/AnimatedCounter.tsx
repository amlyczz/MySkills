import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface Props {
  target: number;
  prefix?: string;
  suffix?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  delay?: number;
  /** Number of frames for the count animation */
  duration?: number;
  /** Pulse amplitude (0-1, default 0.03) */
  pulseAmplitude?: number;
}

export const AnimatedCounter: React.FC<Props> = ({
  target,
  prefix = "",
  suffix = "",
  color = "#FFD700",
  fontSize = 72,
  fontWeight = 800,
  delay = 0,
  duration = 40,
  pulseAmplitude = 0.03,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delay);
  const count = Math.floor(interpolate(elapsed, [0, duration], [0, target], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  }));
  const pulseScale = 1 + Math.sin(elapsed * 0.1) * pulseAmplitude;

  return (
    <div style={{
      fontSize, fontWeight, color,
      fontFamily: "'Inter', sans-serif",
      transform: `scale(${pulseScale})`,
      opacity: interpolate(elapsed, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
    }}>
      {prefix}{count}{suffix}
    </div>
  );
};
