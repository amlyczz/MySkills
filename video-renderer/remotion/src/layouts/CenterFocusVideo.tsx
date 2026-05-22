/**
 * CenterFocusVideo — 中心视频 + 外围标题 + 摄像机运镜布局。
 *
 * 对标宣传片的"实录素材合成流"：
 * 视频被 GlowContainer 包装，VirtualCamera 可推拉缩放，
 * 标题悬浮在视频上方且不受摄像机影响（始终清晰）。
 *
 * Props 复用 LayoutProps + cameraAction / wrapperType
 */
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from "remotion";
import { Video } from "@remotion/media";
import { LayoutProps, CameraAction } from "../types";
import { GlowContainer } from "../wrappers/GlowContainer";
import { VirtualCamera } from "../components/VirtualCamera";
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

  // Title fade-in (first 20 frames)
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const mediaContent = isVideo ? (
    <Video src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  ) : (
    <Img src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: theme.typography.fontFamily,
        gap: 40,
        padding: 80,
      }}
    >
      {/* Title layer — outside camera, always sharp */}
      {title && (
        <h1
          style={{
            opacity: titleOpacity,
            fontSize: FONT_SIZE_TITLE * 0.8,
            fontWeight: FONT_WEIGHT_TITLE,
            letterSpacing: theme.typography.titleLetterSpacing,
            color: style.bodyColor,
            textShadow: style.titleShadow,
            textAlign: "center",
            margin: 0,
            lineHeight: 1.2,
            zIndex: 10,
          }}
        >
          {title}
        </h1>
      )}

      {subtitle && (
        <p
          style={{
            opacity: subtitleOpacity,
            fontSize: 24,
            color: style.mutedColor,
            textAlign: "center",
            margin: 0,
            zIndex: 10,
          }}
        >
          {subtitle}
        </p>
      )}

      {/* Video layer — within camera and wrapper */}
      <div style={{ width: "85%", maxWidth: 1200, zIndex: 5 }}>
        {cameraAction ? (
          <VirtualCamera action={cameraAction} sceneFrames={sceneFrames}>
            {wrapperType === "glow" ? (
              <GlowContainer>{mediaContent}</GlowContainer>
            ) : (
              mediaContent
            )}
          </VirtualCamera>
        ) : wrapperType === "glow" ? (
          <GlowContainer>{mediaContent}</GlowContainer>
        ) : (
          mediaContent
        )}
      </div>
    </AbsoluteFill>
  );
};
