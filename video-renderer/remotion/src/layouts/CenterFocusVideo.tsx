/**
 * CenterFocusVideo — 中心视频 + 外围标题 + 摄像机运镜布局。
 */
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from "remotion";
import { Video } from "@remotion/media";
import { LayoutProps, CameraAction } from "../types";
import { GlowContainer } from "../wrappers/GlowContainer";
import { VirtualCamera } from "../components/VirtualCamera";
import { DeviceFrame } from "../wrappers/DeviceFrame";
import { FONT_SIZE_TITLE, FONT_WEIGHT_TITLE } from "../layout";

export const CenterFocusVideo: React.FC<LayoutProps & {
  cameraAction?: CameraAction;
  wrapperType?: string;
  sceneFrames?: number;
}> = ({
  mediaUrl,
  title,
  subtitle,
  style,
  theme,
  cameraAction,
  wrapperType,
  sceneFrames = 180,
}) => {
  const frame = useCurrentFrame();

  if (!mediaUrl) return null;

  const isVideo =
    mediaUrl.endsWith(".mp4") ||
    mediaUrl.endsWith(".webm") ||
    mediaUrl.endsWith(".mov");

  // Title fade-in
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: "clamp" });

  const mediaContent = isVideo ? (
    <Video src={mediaUrl} playbackRate={1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  ) : (
    <Img src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  );

  const wrapContent = (content: React.ReactNode) => {
    if (wrapperType === "device-frame") return <DeviceFrame>{content}</DeviceFrame>;
    if (wrapperType === "glow") return <GlowContainer glowIntensity={0.6}>{content}</GlowContainer>;
    return content;
  };

  const videoElement = wrapContent(mediaContent);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: theme.typography.fontFamily,
        padding: "60px 40px",
      }}
    >
      {/* Title area at the top */}
      <div style={{ flex: "0 0 auto", textAlign: "center", marginBottom: 40, zIndex: 10 }}>
        {title && (
          <h1
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              fontSize: FONT_SIZE_TITLE * 0.8,
              fontWeight: FONT_WEIGHT_TITLE,
              letterSpacing: theme.typography.titleLetterSpacing,
              color: style.bodyColor,
              textShadow: style.titleShadow,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
        )}
        {subtitle && (
          <p
            style={{
              opacity: subtitleOpacity,
              fontSize: 32,
              color: style.mutedColor,
              margin: "16px 0 0 0",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Video layer centrally aligned */}
      <div style={{ flex: 1, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 5 }}>
        <div style={{ width: "85%", maxWidth: 1400, aspectRatio: "16/9", position: "relative" }}>
          {cameraAction ? (
            <VirtualCamera action={cameraAction} sceneFrames={sceneFrames}>
              {videoElement}
            </VirtualCamera>
          ) : (
            videoElement
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
