/**
 * FluidGradient — 流体渐变背景。
 *
 * 对标 Cohere 发布视频的镭射光斑质感：
 * 4 个高饱和光斑（红/黄/蓝/紫）以不同速度在画面中流动混合，
 * 通过 CSS radial-gradient + 正弦位移实现。
 */
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface Props {
  speed?: number;    // 整体流动速度 (default 1.0)
  intensity?: number; // 饱和度 (default 1.5)
}

const SPOTS = [
  // { hue, size%, initialX%, initialY%, speedX, speedY, phase }
  { color: "rgba(255, 60, 60, 0.6)", size: 55, x: 20, y: 30, sx: 0.03, sy: 0.02, phase: 0 },
  { color: "rgba(255, 200, 40, 0.5)", size: 50, x: 70, y: 60, sx: -0.02, sy: -0.03, phase: 60 },
  { color: "rgba(60, 120, 255, 0.55)", size: 48, x: 50, y: 20, sx: -0.025, sy: 0.015, phase: 120 },
  { color: "rgba(160, 40, 255, 0.5)", size: 45, x: 80, y: 80, sx: 0.015, sy: -0.025, phase: 180 },
];

export const FluidGradient: React.FC<Props> = ({
  speed = 1.0,
  intensity = 1.5,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const bgStyle = useMemo(() => {
    const t = (frame / fps) * speed;

    // Dark base to make colors pop
    const gradients = [
      "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(10,10,30,1) 0%, rgba(0,0,0,1) 100%)",
    ];

    // Add fluid spots
    for (const spot of SPOTS) {
      const x = spot.x + Math.sin(t * spot.sx + spot.phase) * 25;
      const y = spot.y + Math.cos(t * spot.sy + spot.phase) * 25;
      gradients.push(
        `radial-gradient(ellipse ${spot.size}% ${spot.size}% at ${x}% ${y}%, ${spot.color} 0%, transparent 70%)`
      );
    }

    return {
      background: gradients.join(", "),
      filter: `saturate(${intensity}) contrast(1.1)`,
    };
  }, [frame, fps, speed, intensity]);

  return (
    <AbsoluteFill style={bgStyle} />
  );
};
