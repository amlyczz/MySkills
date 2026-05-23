/**
 * MediaFull — 素材全屏布局（升级版）。
 *
 * 支持 wrapperType:
 *   "device-frame" → DeviceFrame 包装
 *   "glow" → GlowContainer 包装
 *   默认 → PerspectiveFrame 3D 画框包装
 *
 * 入场 scale spring + 持续浮动动画。
 */
import React from "react";
import { AbsoluteFill, AnimatedImage, Img, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { LayoutProps } from "../types";
import { DeviceFrame } from "../wrappers/DeviceFrame";
import { GlowContainer } from "../wrappers/GlowContainer";
import { PerspectiveFrame } from "../wrappers/PerspectiveFrame";

export const MediaFull: React.FC<LayoutProps> = ({
  mediaUrl,
  wrapperType,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!mediaUrl) return null;

  const isVideo =
    mediaUrl.endsWith(".mp4") ||
    mediaUrl.endsWith(".webm") ||
    mediaUrl.endsWith(".mov");

  // Entrance spring
  const entranceProgress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 60, mass: 0.8 },
  });

  const scale = 0.9 + entranceProgress * 0.1;
  const opacity = entranceProgress;

  const mediaContent = isVideo ? (
    <Video
      src={mediaUrl}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  ) : mediaUrl.endsWith(".gif") ? (
    <AnimatedImage
      src={mediaUrl}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  ) : (
    <Img
      src={mediaUrl}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );

  const wrappedContent = wrapperType === "device-frame" ? (
    <DeviceFrame device="macbook">
      <div style={{ width: "100%", height: "100%", background: "#000" }}>
        {mediaContent}
      </div>
    </DeviceFrame>
  ) : wrapperType === "glow" ? (
    <GlowContainer borderRadius={16} glowIntensity={0.6}>
      {mediaContent}
    </GlowContainer>
  ) : (
    <PerspectiveFrame borderRadius={16}>
      {mediaContent}
    </PerspectiveFrame>
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div style={{ width: "80%", height: "80%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {wrappedContent}
      </div>
    </AbsoluteFill>
  );
};
