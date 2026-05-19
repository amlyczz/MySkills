import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BackgroundProps } from "./Starfield";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const GeometricPatterns: React.FC<BackgroundProps> = ({
  primaryColor,
  accentColor,
  bgColor,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const patterns = Array.from({ length: 20 }).map((_, i) => {
    const rotation = spring({
      frame: frame - i * 3,
      fps: 30,
      from: 0,
      to: 360,
      config: { damping: 100 },
    });

    const scale = spring({
      frame: frame - i * 3,
      fps: 30,
      from: 0.5,
      to: 1,
      config: { damping: 100 },
    });

    // Alternate between primary and accent colors
    const borderColor =
      i % 2 === 0
        ? hexToRgba(primaryColor, 0.12)
        : hexToRgba(accentColor, 0.08);

    return { rotation, scale, index: i, borderColor };
  });

  return (
    <div
      style={{
        width,
        height,
        background: bgColor,
        overflow: "hidden",
      }}
    >
      {patterns.map(({ rotation, scale, index, borderColor }) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "100%",
            height: "100%",
            transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
            border: `2px solid ${borderColor}`,
            borderRadius: `${index * 5}%`,
          }}
        />
      ))}
    </div>
  );
};
