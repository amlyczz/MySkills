/**
 * Aurora — Optimized aurora background.
 *
 * 3 gradient bands (down from 5) with reduced blur.
 * Stars reduced to 10 (from 20). No SVG noise overlay.
 */
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BackgroundProps } from "./Starfield";

interface AuroraBand {
  color1: string;
  color2: string;
  angle: number;
  y: number;
  height: number;
  speed: number;
  amplitude: number;
  phase: number;
  opacity: number;
}

const BANDS: AuroraBand[] = [
  { color1: "rgba(60, 120, 255, 0.35)", color2: "rgba(120, 60, 255, 0.15)", angle: -15, y: 20, height: 35, speed: 0.02, amplitude: 40, phase: 0, opacity: 0.7 },
  { color1: "rgba(140, 60, 255, 0.3)", color2: "rgba(200, 80, 180, 0.1)", angle: -8, y: 45, height: 28, speed: 0.018, amplitude: 45, phase: 160, opacity: 0.55 },
  { color1: "rgba(80, 200, 180, 0.25)", color2: "rgba(60, 140, 255, 0.1)", angle: 5, y: 65, height: 22, speed: 0.022, amplitude: 30, phase: 240, opacity: 0.5 },
];

const STARS = Array.from({ length: 10 }, (_, i) => ({
  x: (i * 137.5) % 100,
  y: (i * 97.3 + 13) % 100,
  size: 1 + (i % 3) * 0.5,
  twinkleSpeed: 0.04 + (i % 5) * 0.01,
}));

export const Aurora: React.FC<BackgroundProps & { speed?: number }> = ({
  speed = 1.0,
}) => {
  const frame = useCurrentFrame();
  const t = (frame / 30) * speed;

  const bandStyles = useMemo(() => {
    return BANDS.map((band) => {
      const drift = Math.sin(t * band.speed * 60 + band.phase) * band.amplitude;
      const verticalShift = Math.cos(t * band.speed * 40 + band.phase) * 6;
      return {
        position: "absolute" as const,
        left: "-20%",
        right: "-20%",
        top: `${band.y + verticalShift}%`,
        height: `${band.height}%`,
        background: `linear-gradient(${band.angle}deg, transparent 0%, ${band.color1} 30%, ${band.color2} 60%, transparent 100%)`,
        transform: `translateX(${drift}px)`,
        opacity: band.opacity,
        mixBlendMode: "screen" as const,
        filter: "blur(12px)",
      };
    });
  }, [frame, speed]);

  return (
    <>
      {/* Dark base */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 35%, #0a0f32, #03030f)",
        }}
      />
      {/* Stars */}
      {STARS.map((star, i) => {
        const twinkle = 0.3 + Math.sin(t * star.twinkleSpeed * 60) * 0.3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              borderRadius: "50%",
              background: "rgba(200,220,255,0.8)",
              opacity: twinkle,
            }}
          />
        );
      })}
      {/* Aurora bands */}
      {bandStyles.map((style, i) => (
        <div key={i} style={style} />
      ))}
    </>
  );
};
