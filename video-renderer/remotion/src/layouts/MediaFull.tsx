/**
 * MediaFull — 纯素材全屏布局。
 *
 * 用于 showcase 场景：视频/图片铺满画面。
 */
import React from "react";
import { AbsoluteFill, Img, Video, useCurrentFrame } from "remotion";
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
      {isVideo ? (
        <Video src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <Img src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      )}
    </AbsoluteFill>
  );
};
