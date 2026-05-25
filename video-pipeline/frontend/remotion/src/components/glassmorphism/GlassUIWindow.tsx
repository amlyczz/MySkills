import React, { type ReactNode } from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";

interface Props {
  children?: ReactNode;
  width?: number | string;
  height?: number | string;
  x?: number;
  y?: number;
  delay?: number;
  borderRadius?: number;
  blur?: number;
  opacity?: number;
  borderColor?: string;
  shadow?: string;
  position?: "absolute" | "relative";
}

export const GlassUIWindow: React.FC<Props> = ({
  children,
  width = 400,
  height = 300,
  x = 0,
  y = 0,
  delay = 0,
  borderRadius = 16,
  blur = 24,
  opacity = 0.08,
  borderColor = "rgba(255,255,255,0.15)",
  shadow = "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
  position = "absolute",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - delay);

  const scale = spring({
    frame: elapsed,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const fadeOpacity = interpolate(elapsed, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  // When relative, avoid scale spring which causes layout thrashing
  const animTransform = position === "absolute"
    ? `scale(${scale})`
    : `translateY(${interpolate(elapsed, [0, 12], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })}px)`;

  return (
    <div
      style={{
        position,
        ...(position === "absolute" ? { left: x, top: y } : {}),
        width,
        height,
        borderRadius,
        border: `1px solid ${borderColor}`,
        background: `rgba(255,255,255,${opacity})`,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        boxShadow: shadow,
        overflow: "hidden",
        opacity: fadeOpacity,
        transform: animTransform,
      }}
    >
      {children}
    </div>
  );
};
