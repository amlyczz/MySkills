/**
 * SandwichText — 景深夹心布局。
 *
 * 三层 z-index：
 *   背景层（z:0）= 图片/视频
 *   文字层（z:10）= 居中大字标题
 *   前景层（z:20）= UI 卡片浮动
 *
 * 对标 Google Flow 0:31 的空间纵深感。
 */
import React from "react";
import { AbsoluteFill, Img, Video, useCurrentFrame, interpolate } from "remotion";
import { LayoutProps } from "../types";
import { FONT_SIZE_TITLE, FONT_WEIGHT_TITLE } from "../layout";

export const SandwichText: React.FC<LayoutProps> = ({
  title, subtitle, points, mediaUrl, style, theme,
}) => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const titleScale = interpolate(frame, [10, 30], [0.95, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const isVideo = mediaUrl?.endsWith(".mp4") || mediaUrl?.endsWith(".webm");

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", fontFamily: theme.typography.fontFamily }}>
      {/* Layer 0: Background image/video */}
      {mediaUrl && (
        <AbsoluteFill style={{ zIndex: 0 }}>
          {isVideo ? (
            <Video src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
          ) : (
            <Img src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
          )}
        </AbsoluteFill>
      )}

      {/* Layer 10: Center text — sandwiched between bg and cards */}
      <AbsoluteFill style={{ zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
        <div style={{ textAlign: "center", opacity: titleOpacity, transform: `scale(${titleScale})` }}>
          {title && (
            <h1 style={{ fontSize: FONT_SIZE_TITLE * 0.9, fontWeight: FONT_WEIGHT_TITLE, color: style.bodyColor, textShadow: style.titleShadow, letterSpacing: theme.typography.titleLetterSpacing, margin: 0, lineHeight: 1.1 }}>
              {title}
            </h1>
          )}
          {subtitle && (
            <p style={{ fontSize: 24, color: style.mutedColor, marginTop: 16 }}>{subtitle}</p>
          )}
        </div>
      </AbsoluteFill>

      {/* Layer 20: Foreground floating cards */}
      {points && points.length > 0 && (
        <AbsoluteFill style={{ zIndex: 20, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 60, gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
            {points.slice(0, 3).map((p, i) => {
              const cardOpacity = interpolate(frame, [30 + i * 15, 50 + i * 15], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
              return (
                <div key={i} style={{
                  opacity: cardOpacity,
                  background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
                  borderRadius: 16, border: "1px solid rgba(255,255,255,0.15)",
                  padding: "16px 20px", color: style.bodyColor, fontSize: 16, fontWeight: 500,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}>
                  {p}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
