/**
 * WhipPanTransition — 甩镜头转场组件。
 *
 * 对标 Chrome Skills 的定向动态模糊加速：
 * 加速阶段 → 匀速段（最大模糊） → 减速阶段。
 *
 * Props: direction, durationFrames
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  children: React.ReactNode;
  direction?: "left" | "right" | "up" | "down";
  durationFrames?: number;
}

export const WhipPanTransition: React.FC<Props> = ({
  children,
  direction = "left",
  durationFrames = 20,
}) => {
  const frame = useCurrentFrame();

  // Speed curve: ease-in-out — fast middle, slow edges
  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Velocity peaks at midpoint → max blur
  const velocity = Math.sin(progress * Math.PI); // 0→1→0
  const blur = velocity * 12; // max 12px blur at peak

  const tx = interpolate(progress, [0, 1],
    direction === "left" ? [100, 0] :
    direction === "right" ? [-100, 0] :
    [0, direction === "down" ? -80 : 80],
  );

  const ty = interpolate(progress, [0, 1],
    direction === "up" ? [80, 0] :
    direction === "down" ? [-80, 0] :
    [0, 0],
  );

  return (
    <div
      style={{
        filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
        transform: `translate(${tx}px, ${ty}px)`,
        width: "100%",
        height: "100%",
      }}
    >
      {children}
    </div>
  );
};
