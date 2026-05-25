import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

interface Props {
  text: string;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  delay?: number;
  direction?: "up" | "down";
  duration?: number;
  letterSpacing?: string;
  textAlign?: "left" | "center" | "right";
}

export const BlurFadeText: React.FC<Props> = ({
  text,
  fontSize = 80,
  color = "#FFFFFF",
  fontWeight = 700,
  delay = 0,
  direction = "up",
  duration = 15,
  letterSpacing = "-0.02em",
  textAlign = "left",
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delay);

  const opacity = interpolate(elapsed, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const translateY = interpolate(elapsed, [0, duration], [direction === "up" ? 30 : -30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const blur = interpolate(elapsed, [0, Math.floor(duration * 0.7)], [10, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontSize,
        color,
        fontWeight,
        letterSpacing,
        textAlign,
        lineHeight: 1.1,
        opacity,
        transform: `translateY(${translateY}px)`,
        filter: `blur(${blur}px)`,
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      {text}
    </div>
  );
};
