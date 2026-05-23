/**
 * PerspectiveFrame — 3D 透视画框容器。
 *
 * 微倾斜 + 旋转渐变边框 + 浮动动画 + 动态阴影。
 * 用于图片/视频的 premium 展示。
 */
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface PerspectiveFrameProps {
  children: React.ReactNode;
  borderRadius?: number;
  borderGradient?: string[];
  tiltX?: number;
  tiltY?: number;
  floatAmplitude?: number;
  shadowColor?: string;
  width?: string;
  height?: string;
}

export const PerspectiveFrame: React.FC<PerspectiveFrameProps> = ({
  children,
  borderRadius = 16,
  borderGradient = ["#6366f1", "#06b6d4", "#8b5cf6", "#6366f1"],
  tiltX = 3,
  tiltY = -5,
  floatAmplitude = 4,
  shadowColor = "rgba(100,100,255,0.3)",
  width = "100%",
  height = "100%",
}) => {
  const frame = useCurrentFrame();

  // Floating animation
  const floatY = Math.sin(frame * 0.04) * floatAmplitude;

  // Animated gradient angle
  const gradAngle = interpolate(frame % 300, [0, 300], [0, 360]);

  // Dynamic shadow offset
  const shadowOffsetX = Math.sin(frame * 0.03) * 8;
  const shadowOffsetY = Math.cos(frame * 0.03) * 6 + 4;

  const gradColors = borderGradient.join(", ");

  return (
    <div
      style={{
        perspective: "800px",
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(${floatY}px)`,
          transformStyle: "preserve-3d",
          width: "100%",
          height: "100%",
          borderRadius,
        }}
      >
        {/* Animated gradient border */}
        <div
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: borderRadius + 2,
            background: `linear-gradient(${gradAngle}deg, ${gradColors})`,
            zIndex: 0,
          }}
        />
        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
            borderRadius,
            overflow: "hidden",
            boxShadow: `${shadowOffsetX}px ${shadowOffsetY}px 20px ${shadowColor}`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
