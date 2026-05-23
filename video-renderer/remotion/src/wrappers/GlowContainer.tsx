/**
 * GlowContainer — 流光边框包装容器。
 *
 * 对标顶级宣传片的设备投射效果：4 色渐变流光边框 + 圆角 +
 * 内阴影高光，将原始矩形视频包装为高级展示容器。
 *
 * Props:
 *   colors: 4 色数组（默认 Google 四色）
 *   borderRadius: 圆角半径 px
 *   glowIntensity: 光晕强度 0-1
 */
import React from "react";
import { useCurrentFrame } from "remotion";

interface Props {
  children: React.ReactNode;
  colors?: [string, string, string, string];
  borderRadius?: number;
  glowIntensity?: number;
}

export const GlowContainer: React.FC<Props> = ({
  children,
  colors = ["#4285F4", "#34A853", "#FBBC05", "#EA4335"],
  borderRadius = 24,
  glowIntensity = 0.6,
}) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.06) * 0.12;
  const effectiveIntensity = glowIntensity + pulse;
  const gradAngle = (frame * 0.5) % 360;
  const tiltY = Math.sin(frame * 0.02) * 1.2;

  const gradient = `linear-gradient(${gradAngle}deg, ${colors.join(", ")})`;

  return (
    <div
      style={{
        position: "relative",
        borderRadius,
        overflow: "hidden",
        perspective: "1000px",
        transform: `rotateY(${tiltY}deg)`,
        boxShadow: `0 0 ${30 * effectiveIntensity}px rgba(255,255,255,${0.15 * effectiveIntensity}),
                     inset 0 0 ${20 * effectiveIntensity}px rgba(255,255,255,${0.1 * effectiveIntensity})`,
      }}
    >
      {/* Glow border ring */}
      <div
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: borderRadius + 2,
          background: gradient,
          opacity: effectiveIntensity,
          filter: `blur(${4 * effectiveIntensity}px)`,
          zIndex: 0,
        }}
      />
      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};
