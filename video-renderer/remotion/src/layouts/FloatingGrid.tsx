/**
 * FloatingGrid — 卡片群飞入布局。
 *
 * 对标 Chrome Skills 0:21 的多图层空间阵列：
 * 卡片从屏幕四角外随机位置 → 弹簧吸附到网格目标位置。
 *
 * Props: items[] + columns
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { LayoutProps } from "../types";
import { FONT_SIZE_TITLE, FONT_WEIGHT_TITLE } from "../layout";

export const FloatingGrid: React.FC<LayoutProps> = ({
  title,
  points,
  style,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = (points || []).map((p, i) => ({
    label: p as string,
    index: i,
  }));
  const columns = 3;
  const gap = 24;
  const cardW = 280;
  const cardH = 160;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: theme.typography.fontFamily,
        gap: 40,
        padding: 80,
      }}
    >
      {title && (
        <h1 style={{
          fontSize: FONT_SIZE_TITLE,
          fontWeight: FONT_WEIGHT_TITLE,
          color: style.bodyColor,
          textShadow: style.titleShadow,
          margin: 0,
        }}>
          {title}
        </h1>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, ${cardW}px)`,
          gap,
          justifyContent: "center",
        }}
      >
        {items.map((item, i) => {
          const staggerDelay = i * 8;
          const activeFrame = Math.max(0, frame - staggerDelay);

          const progress = spring({
            frame: activeFrame,
            fps,
            config: { damping: 14, stiffness: 80, mass: 0.8 },
          });

          // Random-like start position based on index
          const startX = (i % 2 === 0 ? -200 : 200) + (i % 3) * 40;
          const startY = (i < 3 ? -150 : 150) + (i % 2) * 30;

          const tx = interpolate(progress, [0, 1], [startX, 0]);
          const ty = interpolate(progress, [0, 1], [startY, 0]);
          const opacity = interpolate(progress, [0, 1], [0, 1]);
          const scale = interpolate(progress, [0, 1], [0.7, 1]);
          const rotation = interpolate(progress, [0, 1], [(i % 2 === 0 ? 15 : -15), 0]);

          return (
            <div
              key={i}
              style={{
                width: cardW, height: cardH,
                opacity, transform: `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${rotation}deg)`,
                borderRadius: 16,
                background: `rgba(255,255,255,${style.glassOpacity ?? 0.08})`,
                backdropFilter: style.backdropBlur ? `blur(${style.backdropBlur}px)` : undefined,
                border: "1px solid rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 24,
                boxShadow: `0 ${progress * 20}px ${progress * 40}px rgba(0,0,0,0.3)`,
              }}
            >
              <span style={{
                fontSize: 20, fontWeight: 600, color: style.bodyColor,
                textAlign: "center", lineHeight: 1.4,
              }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
