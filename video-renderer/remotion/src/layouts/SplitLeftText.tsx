import React from "react";
import {
  AbsoluteFill,
  AnimatedImage,
  Img,
} from "remotion";
import { LayoutProps } from "../types";
import { getMotion } from "../motions";
import { useElementLifecycle } from "../hooks/useElementLifecycle";
import { AnimatedBarChart } from "../components/AnimatedBarChart";
import { SfxPlayer } from "../components/SfxPlayer";
import {
  CONTENT_PAD, TEXT_MAX_WIDTH, GAP_POINTS, DOT_SIZE,
  FONT_SIZE_TITLE, FONT_SIZE_TAGLINE, FONT_SIZE_POINTS,
  FONT_WEIGHT_TITLE, FONT_WEIGHT_TAGLINE, FONT_WEIGHT_POINTS,
} from "../layout";

export const SplitLeftText: React.FC<LayoutProps & { direction?: "left" | "right" }> = ({
  title,
  subtitle,
  points,
  chartData,
  mediaUrl,
  style,
  theme,
  motionMap,
  showBullet = true,
  direction = "left",
  sceneDurationFrames,
  staggerOrder,
}) => {
  const getStaggerIndex = (key: string, defaultIndex: number) => {
    if (!staggerOrder) return defaultIndex;
    const idx = staggerOrder.indexOf(key);
    return idx >= 0 ? idx : defaultIndex;
  };

  // ── Title ──
  const titleLifecycle = useElementLifecycle(getMotion(motionMap, "title", "arc-entrance"), {
    sceneDurationFrames,
    staggerIndex: getStaggerIndex("title", 0),
  });

  // ── Subtitle ──
  const subLifecycle = useElementLifecycle(getMotion(motionMap, "subtitle", "scale-fade"), {
    sceneDurationFrames,
    staggerIndex: getStaggerIndex("subtitle", 1),
  });

  // ── Media/Chart ──
  const mediaLifecycle = useElementLifecycle(getMotion(motionMap, "media", "scale-up"), {
    sceneDurationFrames,
    staggerIndex: getStaggerIndex("media", 2),
  });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: direction === "right" ? "row-reverse" : "row", padding: CONTENT_PAD }}>
      {/* 文案区域 (1/3) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          ...(direction === "right" ? { paddingLeft: 40 } : { paddingRight: 40 }),
        }}
      >
        {title && (
          <div
            style={{
              ...titleLifecycle.style,
              fontSize: FONT_SIZE_TITLE * 0.75,
              fontWeight: FONT_WEIGHT_TITLE,
              letterSpacing: theme.typography.titleLetterSpacing,
              textTransform: style.titleTransform,
              color: style.bodyColor,
              textShadow: style.titleShadow,
              lineHeight: 1.1,
              marginBottom: 20,
            }}
          >
            {title}
          </div>
        )}

        {subtitle && (
          <div
            style={{
              ...subLifecycle.style,
              fontSize: FONT_SIZE_TAGLINE,
              fontWeight: FONT_WEIGHT_TAGLINE,
              color: style.mutedColor,
              maxWidth: TEXT_MAX_WIDTH * 0.5,
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            {subtitle}
          </div>
        )}

        {(points ?? []).length > 0 && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: GAP_POINTS }}
          >
            {(points ?? []).slice(0, 5).map((point, i) => {
              const pointLifecycle = useElementLifecycle(getMotion(motionMap, "points", "spring-slide-up"), {
                sceneDurationFrames,
                staggerIndex: getStaggerIndex("points", 3) + i,
                staggerInterval: 8,
              });

              return (
                <div
                  key={i}
                  style={{
                    ...pointLifecycle.style,
                    fontSize: FONT_SIZE_POINTS,
                    fontWeight: FONT_WEIGHT_POINTS,
                    lineHeight: 1.5,
                    color: style.mutedColor,
                    display: "flex",
                    alignItems: "center",
                    gap: GAP_POINTS,
                  }}
                >
                  {showBullet && (
                    <span
                      style={{
                        display: "inline-block",
                        width: DOT_SIZE,
                        height: DOT_SIZE,
                        borderRadius: "50%",
                        backgroundColor: style.bulletColor,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {point}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 右侧 2/3 素材/图表/留白 */}
      <div style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", ...mediaLifecycle.style }}>
        {chartData && chartData.length > 0 ? (
          <AnimatedBarChart data={chartData} accentColor={theme.colors.accent} />
        ) : mediaUrl ? (
          mediaUrl.endsWith(".gif") ? (
            <AnimatedImage src={mediaUrl} style={{ maxWidth: "100%", maxHeight: "80%", borderRadius: theme.decoration.borderRadius, objectFit: "contain" }} />
          ) : (
            <Img src={mediaUrl} alt="" style={{ maxWidth: "100%", maxHeight: "80%", borderRadius: theme.decoration.borderRadius, objectFit: "contain" }} />
          )
        ) : null}
      </div>

      {/* SFX */}
      {title && <SfxPlayer motion={getMotion(motionMap, "title", "arc-entrance")} staggerIndex={getStaggerIndex("title", 0)} />}
      {subtitle && <SfxPlayer motion={getMotion(motionMap, "subtitle", "scale-fade")} staggerIndex={getStaggerIndex("subtitle", 1)} />}
      {(points ?? []).map((_, i) => (
        <SfxPlayer key={i} motion={getMotion(motionMap, "points", "spring-slide-up")} staggerIndex={getStaggerIndex("points", 3) + i} />
      ))}
    </AbsoluteFill>
  );
};
