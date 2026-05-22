/**
 * LayoutAnimationWrapper — 布局级入场动画包裹器。
 *
 * 接收 MotionPreset + children，内部调用 useEntrance 计算入场效果，
 * 返回带 transform/opacity/filter 样式的包裹 <div>。
 *
 * 为简单布局（如 MediaFull 及未来新增布局）提供统一动画入口。
 * 当前不强制迁移现有复杂布局（FloatingGrid/KineticText/ZAxisFlyThrough 等保有其独特动画）。
 */
import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { MotionPreset } from "../types";
import { useEntrance } from "../hooks/useEntrance";

export interface LayoutAnimationWrapperProps {
  motion: MotionPreset;
  children: React.ReactNode;
  /** 延迟帧数（相对于外层帧计数器） */
  delayFrames?: number;
  /** 附加内联样式 */
  style?: React.CSSProperties;
}

export const LayoutAnimationWrapper: React.FC<LayoutAnimationWrapperProps> = ({
  motion,
  children,
  delayFrames = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - delayFrames);

  const entrance = useEntrance(motion, localFrame);

  const combinedStyle: React.CSSProperties = useMemo(
    () => ({
      opacity: entrance.opacity,
      transform: entrance.transform,
      clipPath: entrance.clipPath,
      filter: entrance.filter,
      width: "100%",
      height: "100%",
      ...style,
    }),
    [entrance, style],
  );

  return <div style={combinedStyle}>{children}</div>;
};
