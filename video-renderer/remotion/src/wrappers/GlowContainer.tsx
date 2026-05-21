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
  const gradient = `linear-gradient(135deg, ${colors.join(", ")})`;

  return (
    <div
      style={{
        position: "relative",
        borderRadius,
        overflow: "hidden",
        boxShadow: `0 0 ${30 * glowIntensity}px rgba(255,255,255,${0.15 * glowIntensity}),
                     inset 0 0 ${20 * glowIntensity}px rgba(255,255,255,${0.1 * glowIntensity})`,
      }}
    >
      {/* Glow border ring */}
      <div
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: borderRadius + 2,
          background: gradient,
          opacity: glowIntensity,
          filter: `blur(${4 * glowIntensity}px)`,
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
