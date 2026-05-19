import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BackgroundProps } from "./Starfield";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export const BokehCircles: React.FC<BackgroundProps> = ({
  primaryColor,
  accentColor,
  bgColor,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const t = frame / fps;

  // Derive 3 colors from props for variety
  const rgb1 = hexToRgb(primaryColor);
  const rgb2 = hexToRgb(accentColor);
  const rgb3: [number, number, number] = [
    Math.min(255, rgb1[0] + 40),
    Math.min(255, rgb1[1] + 40),
    Math.min(255, rgb1[2] + 40),
  ];
  const colorOptions = [rgb1, rgb2, rgb3];

  const circles = Array.from({ length: 15 }, (_, i) => {
    const baseX = ((i * 173 + 53) % 100) / 100;
    const baseY = ((i * 241 + 97) % 100) / 100;

    const driftX = Math.sin(t * 0.2 + i * 1.3) * 30;
    const driftY = Math.cos(t * 0.15 + i * 0.9) * 25;

    const x = baseX * width + driftX;
    const y = baseY * height + driftY;

    const baseSize = 40 + ((i * 37 + 11) % 80);
    const pulse = Math.sin(t * 0.4 + i * 0.7) * 0.2 + 1;
    const size = baseSize * pulse;

    const opacity = 0.1 + ((i * 19 + 7) % 20) / 100;

    const rgb = colorOptions[i % 3];

    return { x, y, size, opacity, rgb, key: i };
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: bgColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {circles.map((circle) => (
        <div
          key={circle.key}
          style={{
            position: "absolute",
            left: circle.x,
            top: circle.y,
            width: circle.size,
            height: circle.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${circle.rgb[0]}, ${circle.rgb[1]}, ${circle.rgb[2]}, ${circle.opacity + 0.1}) 0%, rgba(${circle.rgb[0]}, ${circle.rgb[1]}, ${circle.rgb[2]}, 0) 100%)`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
};
