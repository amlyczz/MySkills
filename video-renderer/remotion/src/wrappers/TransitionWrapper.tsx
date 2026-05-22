/**
 * TransitionWrapper — 场景入场过渡效果外壳。
 *
 * 封装 5 种过渡类型：none / crossfade / whip-pan / slide-in / slide-out。
 * 替代 SceneBase 中内联的过渡逻辑。
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { TransitionType, TransitionDirection } from "../types";
import { WhipPanTransition } from "../components/WhipPanTransition";

export interface TransitionWrapperProps {
  type: TransitionType;
  direction?: TransitionDirection;
  durationFrames: number;
  children: React.ReactNode;
}

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
  type,
  direction = "left",
  durationFrames,
  children,
}) => {
  const frame = useCurrentFrame();

  if (type === "none" || durationFrames <= 0) {
    return <>{children}</>;
  }

  if (type === "crossfade") {
    const opacity = interpolate(frame, [0, durationFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return <div style={{ opacity }}>{children}</div>;
  }

  if (type === "whip-pan") {
    return (
      <WhipPanTransition direction={direction} durationFrames={durationFrames}>
        {children}
      </WhipPanTransition>
    );
  }

  if (type === "slide-in") {
    const axis = direction === "left" || direction === "right" ? "X" : "Y";
    const from = direction === "left" || direction === "up" ? 120 : -120;
    const offset = interpolate(frame, [0, durationFrames], [from, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const opacity = interpolate(frame, [0, durationFrames], [0.3, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <div style={{ opacity, transform: `translate${axis}(${offset}px)` }}>
        {children}
      </div>
    );
  }

  if (type === "slide-out") {
    // slide-out as incoming: slide from opposite direction
    const oppositeDir =
      direction === "left" ? "right"
      : direction === "right" ? "left"
      : direction === "up" ? "down"
      : "up";
    const axis = oppositeDir === "left" || oppositeDir === "right" ? "X" : "Y";
    const from = oppositeDir === "left" || oppositeDir === "up" ? 120 : -120;
    const offset = interpolate(frame, [0, durationFrames], [from, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <div style={{ transform: `translate${axis}(${offset}px)` }}>
        {children}
      </div>
    );
  }

  return <>{children}</>;
};
