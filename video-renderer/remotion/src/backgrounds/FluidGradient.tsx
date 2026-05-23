/**
 * FluidGradient — 流体渐变背景（升级版）。
 *
 * 多层光斑以不同频率/振幅在画面中流动混合，叠加微噪点纹理。
 * 对标高端宣传片的镭射光斑质感。
 */
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  speed?: number;
  intensity?: number;
}

const SPOTS = [
  // Large slow orbs — ambient color wash
  { color: "rgba(30, 80, 255, 0.45)", size: 70, x: 25, y: 35, sx: 0.015, sy: 0.012, phase: 0 },
  { color: "rgba(140, 40, 255, 0.4)", size: 65, x: 65, y: 55, sx: -0.012, sy: -0.014, phase: 80 },
  { color: "rgba(20, 180, 220, 0.35)", size: 60, x: 45, y: 25, sx: -0.014, sy: 0.01, phase: 160 },
  // Mid-size orbs — richer color mixing
  { color: "rgba(255, 80, 100, 0.35)", size: 45, x: 15, y: 70, sx: 0.02, sy: -0.018, phase: 40 },
  { color: "rgba(255, 180, 30, 0.3)", size: 42, x: 80, y: 15, sx: -0.018, sy: 0.02, phase: 120 },
  { color: "rgba(100, 200, 255, 0.35)", size: 50, x: 55, y: 75, sx: 0.016, sy: -0.016, phase: 200 },
  // Small bright highlights — sparkle
  { color: "rgba(180, 140, 255, 0.4)", size: 25, x: 35, y: 45, sx: 0.025, sy: 0.022, phase: 60 },
  { color: "rgba(80, 220, 200, 0.35)", size: 28, x: 70, y: 40, sx: -0.022, sy: -0.02, phase: 180 },
];

export const FluidGradient: React.FC<Props> = ({
  speed = 1.0,
  intensity = 1.5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgStyle = useMemo(() => {
    const t = (frame / fps) * speed;

    // Lighter deep base so color spots are visible
    const gradients = [
      "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(20,20,60,1) 0%, rgba(5,5,20,1) 100%)",
    ];

    for (const spot of SPOTS) {
      const x = spot.x + Math.sin(t * spot.sx + spot.phase) * 30;
      const y = spot.y + Math.cos(t * spot.sy + spot.phase) * 30;
      gradients.push(
        `radial-gradient(ellipse ${spot.size}% ${spot.size}% at ${x}% ${y}%, ${spot.color} 0%, transparent 65%)`
      );
    }

    return {
      background: gradients.join(", "),
      filter: `saturate(${intensity}) contrast(1.05) brightness(1.1)`,
    };
  }, [frame, fps, speed, intensity]);

  return (
    <>
      <AbsoluteFill style={bgStyle} />
      {/* Subtle noise grain overlay for film-like texture */}
      <AbsoluteFill
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />
    </>
  );
};
