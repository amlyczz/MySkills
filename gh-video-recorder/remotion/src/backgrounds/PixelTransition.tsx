import React from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { BackgroundProps } from "./Starfield";

function hexToHsl(hex: string): [number, number, number] {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [h * 360, s * 100, l * 100];
}

export const PixelTransition: React.FC<BackgroundProps> = ({
  primaryColor,
  bgColor,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const pixelSize = 30;
  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);

  // Get base hue from primary color for theme-aware palette
  const [baseHue] = hexToHsl(primaryColor);

  const pixels: { x: number; y: number; color: string }[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const seed = col * 1000 + row;
      const delay = Math.floor(random(seed) * 40);

      if (frame <= delay) continue;

      // Fade-in based on how long the pixel has been visible
      const age = frame - delay;
      const alpha = Math.min(age / 10, 0.7);

      // Color: rotate around base hue with variation
      const hue =
        (baseHue + Math.floor(random(seed * 2) * 120) - 60 + 360) % 360;
      const saturation = 50 + Math.floor(random(seed * 3) * 40);
      const lightness = 35 + Math.floor(random(seed * 4) * 25);

      pixels.push({
        x: col * pixelSize,
        y: row * pixelSize,
        color: `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`,
      });
    }
  }

  return (
    <div
      style={{
        width,
        height,
        background: bgColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {pixels.map((pixel, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: pixel.x,
            top: pixel.y,
            width: pixelSize,
            height: pixelSize,
            backgroundColor: pixel.color,
          }}
        />
      ))}
    </div>
  );
};
