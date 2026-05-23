import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, AnimatedImage, interpolate, spring, staticFile, Sequence } from "remotion";
import { Video } from "@remotion/media";
import { LayoutProps } from "../types";
import { CONTENT_PAD, FONT_SIZE_TITLE, FONT_WEIGHT_TITLE, CARD_BORDER_RADIUS } from "../layout";
import { GlowContainer } from "../wrappers/GlowContainer";

export const MediaGallery: React.FC<LayoutProps> = ({
  title,
  subtitle,
  points = [],
  style,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Combine media URLs from points
  const rawMediaItems = points.length > 0 ? points : [
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
  ];

  const mediaItems = rawMediaItems.map(url => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return staticFile(url);
  });

  const titleOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [-20, 0], { extrapolateRight: "clamp" });

  const isVideo = (url: string) => url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov");

  // Slow smooth pan — very subtle background motion
  const panY = Math.sin(frame * 0.003) * 8;

  return (
    <AbsoluteFill style={{ padding: CONTENT_PAD, fontFamily: theme.typography.fontFamily, display: "flex", flexDirection: "column" }}>
      {/* Title area — 左上角固定, 毛玻璃背景条 */}
      {title && (
        <div style={{
          position: "absolute",
          top: 30,
          left: 60,
          zIndex: 10,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "10px 24px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <h1 style={{
            fontSize: 48,
            fontWeight: FONT_WEIGHT_TITLE,
            color: style.bodyColor,
            margin: 0,
            letterSpacing: theme.typography.titleLetterSpacing,
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: 20,
              color: style.mutedColor,
              margin: "6px 0 0 0",
              lineHeight: 1.4,
              maxWidth: 600,
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Grid Gallery — 固定列数, 根据数量自适应: 1个=单列, 2个=2列, 4个=2x2 */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: mediaItems.length === 1 ? "1fr" : "1fr 1fr",
        gap: 24,
        padding: "40px 60px",
        transform: `translateY(${panY}px)`,
        alignContent: "center",
      }}>
        {mediaItems.map((url, i) => {
          const delay = i * 15;
          return (
            <Sequence key={i} from={delay} layout="none">
              <MediaCard url={url} fps={fps} isVideo={isVideo(url)} />
            </Sequence>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const MediaCard = ({ url, fps, isVideo }: { url: string; fps: number; isVideo: boolean }) => {
  const frame = useCurrentFrame(); // Starts at 0 thanks to <Sequence>
  const progress = spring({ frame, fps, config: { damping: 14, stiffness: 80, mass: 0.8 } });
  
  const scale = interpolate(progress, [0, 1], [0.9, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const yOffset = interpolate(progress, [0, 1], [40, 0]);

  return (
    <div style={{
      width: "100%",
      aspectRatio: "16/9",
      opacity,
      transform: `scale(${scale}) translateY(${yOffset}px)`,
    }}>
      <GlowContainer borderRadius={CARD_BORDER_RADIUS} glowIntensity={0.3}>
        <div style={{ width: "100%", height: "100%", borderRadius: CARD_BORDER_RADIUS, overflow: "hidden", position: "relative" }}>
          {isVideo ? (
            <Video src={url} playbackRate={1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : url.endsWith(".gif") ? (
            <AnimatedImage src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
      </GlowContainer>
    </div>
  );
};
