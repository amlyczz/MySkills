import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BackgroundProps } from "./Starfield";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * GeometricPatterns — Animated mesh gradient background.
 *
 * Renders 8 large radial-gradient blobs that drift along unique Lissajous
 * paths, creating a continuously morphing colour field. The result is a
 * rich, modern gradient mesh rather than static geometric shapes.
 */
export const GeometricPatterns: React.FC<BackgroundProps> = ({
  primaryColor,
  accentColor,
  bgColor,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;

  const rgb1 = hexToRgb(primaryColor);
  const rgb2 = hexToRgb(accentColor);
  // A third intermediary colour shifted toward warmer tones
  const rgb3: [number, number, number] = [
    Math.min(255, rgb1[0] + 60),
    Math.max(0, rgb1[1] - 20),
    Math.min(255, rgb2[2] + 40),
  ];
  const palette = [rgb1, rgb2, rgb3];

  // 8 blobs with unique motion parameters
  const blobs = Array.from({ length: 8 }, (_, i) => {
    // Lissajous path frequencies — coprime for non-repeating paths
    const freqX = 0.12 + (i * 0.07);
    const freqY = 0.09 + (i * 0.05);
    const phaseX = (i * 2.3) % (Math.PI * 2);
    const phaseY = (i * 1.7) % (Math.PI * 2);

    // Normalised position [0‒1] centred at 0.5 with unique amplitude
    const ampX = 0.25 + ((i * 17) % 15) / 100;
    const ampY = 0.20 + ((i * 13) % 15) / 100;

    const nx = 0.5 + Math.sin(t * freqX + phaseX) * ampX;
    const ny = 0.5 + Math.cos(t * freqY + phaseY) * ampY;

    const x = nx * width;
    const y = ny * height;

    // Blob size: 40‒70 % of viewport diagonal, pulsing gently
    const diag = Math.sqrt(width * width + height * height);
    const baseSize = diag * (0.4 + ((i * 19) % 30) / 100);
    const pulse = 1 + Math.sin(t * 0.3 + i * 1.1) * 0.08;
    const size = baseSize * pulse;

    // Colour cycles through the palette over time
    const colourT = ((t * 0.15 + i * 0.35) % 1 + 1) % 1;
    const idxA = i % palette.length;
    const idxB = (i + 1) % palette.length;
    const rgb = lerpColor(palette[idxA], palette[idxB], colourT);

    const opacity = 0.35 + ((i * 11) % 15) / 100;

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
      {blobs.map((blob) => (
        <div
          key={blob.key}
          style={{
            position: "absolute",
            left: blob.x,
            top: blob.y,
            width: blob.size,
            height: blob.size,
            borderRadius: "50%",
            background: `radial-gradient(circle at 50% 50%, rgba(${blob.rgb[0]}, ${blob.rgb[1]}, ${blob.rgb[2]}, ${blob.opacity}) 0%, rgba(${blob.rgb[0]}, ${blob.rgb[1]}, ${blob.rgb[2]}, ${blob.opacity * 0.4}) 30%, rgba(${blob.rgb[0]}, ${blob.rgb[1]}, ${blob.rgb[2]}, 0) 75%)`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
};
