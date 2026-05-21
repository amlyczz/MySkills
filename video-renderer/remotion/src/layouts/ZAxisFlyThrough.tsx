/**
 * ZAxisFlyThrough — 3D Z 轴穿梭运镜布局。
 *
 * 对标 Google Flow 0:48 的空间隧道效果：
 * CSS 3D perspective + 图片沿 Z 轴排列 + 摄像机向前推进。
 *
 * Props: images[] + cameraSpeed
 */
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from "remotion";
import { LayoutProps } from "../types";

export const ZAxisFlyThrough: React.FC<LayoutProps> = ({
  title,
  points,
  style,
  theme,
}) => {
  const frame = useCurrentFrame();

  // Parse images from points array (hack: reuse points as image URLs)
  const images: string[] = Array.isArray(points)
    ? (points as string[]).filter(p => typeof p === "string" && (p.startsWith("/") || p.startsWith("http") || p.startsWith("assets/")))
    : [];
  const cameraSpeed = 60; // px/frame

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0E0E10",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        perspective: "1000px",
        transformStyle: "preserve-3d",
        fontFamily: theme.typography.fontFamily,
      }}
    >
      {title && (
        <h1 style={{
          position: "absolute", top: 60, zIndex: 20,
          fontSize: 48, fontWeight: 700,
          color: style.bodyColor, textShadow: style.titleShadow,
        }}>
          {title}
        </h1>
      )}

      {images.length === 0 && (
        <p style={{ color: style.mutedColor, fontSize: 24 }}>
          (No images provided — add image URLs as "points" in content)
        </p>
      )}

      {images.map((imgSrc, index) => {
        const initialZ = -(index * 1200);
        const currentZ = initialZ + frame * cameraSpeed;

        const opacity = interpolate(currentZ, [-4000, -2000, 0, 300], [0, 1, 1, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });

        const rotationY = Math.sin(index) * 15;
        const blurAmount = interpolate(currentZ, [-500, 300], [0, 15], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              width: 800, height: 450,
              opacity,
              transform: `translateZ(${currentZ}px) rotateY(${rotationY}deg)`,
              filter: `blur(${blurAmount}px)`,
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <Img
              src={imgSrc}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
