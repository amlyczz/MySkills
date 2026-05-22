/**
 * whipPanPresentation — 自定义 @remotion/transitions 甩镜头转场 presentation。
 *
 * 对标原有 WhipPanTransition 组件效果：
 * 加速阶段 → 匀速段（最大模糊） → 减速阶段。
 */
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";

export interface WhipPanPresentationProps {
  direction?: "left" | "right" | "up" | "down";
  [key: string]: unknown;
}

type WhipPanComponentProps = TransitionPresentationComponentProps<WhipPanPresentationProps>;

const WhipPanPresentationComponent: React.FC<WhipPanComponentProps> = ({
  children,
  presentationProgress,
  presentationDirection,
  passedProps: { direction = "left" },
}) => {
  const style = useMemo(() => {
    // Velocity peaks at midpoint → max blur
    const velocity = Math.sin(presentationProgress * Math.PI);
    const blur = velocity * 12;

    let transform = "";
    if (presentationDirection === "entering") {
      // Slide from outside (opposite of direction) to center
      if (direction === "left") {
        const tx = interpolate(presentationProgress, [0, 1], [100, 0]);
        transform = `translateX(${tx}%)`;
      } else if (direction === "right") {
        const tx = interpolate(presentationProgress, [0, 1], [-100, 0]);
        transform = `translateX(${tx}%)`;
      } else if (direction === "up") {
        const ty = interpolate(presentationProgress, [0, 1], [80, 0]);
        transform = `translateY(${ty}%)`;
      } else if (direction === "down") {
        const ty = interpolate(presentationProgress, [0, 1], [-80, 0]);
        transform = `translateY(${ty}%)`;
      }
    } else {
      // Slide from center to outside (in direction)
      if (direction === "left") {
        const tx = interpolate(presentationProgress, [0, 1], [0, -100]);
        transform = `translateX(${tx}%)`;
      } else if (direction === "right") {
        const tx = interpolate(presentationProgress, [0, 1], [0, 100]);
        transform = `translateX(${tx}%)`;
      } else if (direction === "up") {
        const ty = interpolate(presentationProgress, [0, 1], [0, -80]);
        transform = `translateY(${ty}%)`;
      } else if (direction === "down") {
        const ty = interpolate(presentationProgress, [0, 1], [0, 80]);
        transform = `translateY(${ty}%)`;
      }
    }

    return {
      width: "100%",
      height: "100%",
      filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
      transform,
    };
  }, [presentationProgress, presentationDirection, direction]);

  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

export const whipPan = (
  props?: WhipPanPresentationProps,
): TransitionPresentation<WhipPanPresentationProps> => {
  return {
    component: WhipPanPresentationComponent,
    props: props ?? {},
  };
};
