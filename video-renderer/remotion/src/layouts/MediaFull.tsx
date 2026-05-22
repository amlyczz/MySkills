/**
 * MediaFull — 纯素材全屏布局。
 *
 * 用于 showcase 场景：视频/图片铺满画面。
 * Demo GIF 等小尺寸素材在 85% 容器内 contain 显示，避免过度放大。
 */
import React from "react";
import { AbsoluteFill, AnimatedImage, Img } from "remotion";
import { Video } from "@remotion/media";
import { LayoutProps } from "../types";

export const MediaFull: React.FC<LayoutProps> = ({
  mediaUrl,
  theme,
}) => {
  if (!mediaUrl) return null;

  const isVideo =
    mediaUrl.endsWith(".mp4") ||
    mediaUrl.endsWith(".webm") ||
    mediaUrl.endsWith(".mov");

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "85%",
          height: "85%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isVideo ? (
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
        )}
      </div>
    </AbsoluteFill>
  );
};
