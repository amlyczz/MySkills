import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props { text: string; colors?: string[]; fontSize?: number; fontWeight?: number; className?: string; }

export const GradientText: React.FC<Props> = ({
  text, colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"], fontSize = 64, fontWeight = 800, className,
}) => {
  const frame = useCurrentFrame();
  const shift = interpolate(frame % 180, [0, 180], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <span className={`font-extrabold tracking-tight ${className || ""}`} style={{
      fontSize, fontWeight,
      background: `linear-gradient(${90 + shift * 3.6}deg, ${colors.join(", ")})`,
      backgroundSize: "200% 200%",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    }}>
      {text}
    </span>
  );
};
