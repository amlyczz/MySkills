import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { LayoutProps } from "../types";
import { getMotion } from "../motions";
import { SfxPlayer } from "../components/SfxPlayer";
import { useElementLifecycle } from "../hooks/useElementLifecycle";
import {
  CONTENT_PAD, CONTENT_MAX_WIDTH, TEXT_MAX_WIDTH,
  UNDERLINE_HEIGHT, UNDERLINE_BORDER_RADIUS,
  GAP_TITLE_UNDERLINE, GAP_UNDERLINE_TAGLINE, GAP_TAGLINE_POINTS, GAP_POINTS,
  DOT_SIZE, FONT_SIZE_TITLE, FONT_SIZE_TAGLINE, FONT_SIZE_POINTS,
  FONT_WEIGHT_TITLE, FONT_WEIGHT_TAGLINE, FONT_WEIGHT_POINTS,
} from "../layout";

export const HeroCenter: React.FC<LayoutProps> = ({
  title, subtitle, points, style, theme, motionMap, mediaUrl,
  showUnderline = true, showBullet = true,
  sceneDurationFrames, staggerOrder,
}) => {
  const getStaggerIndex = (key: string, defaultIndex: number) => {
    if (!staggerOrder) return defaultIndex;
    const idx = staggerOrder.indexOf(key);
    return idx >= 0 ? idx : defaultIndex;
  };

  const titleLifecycle = useElementLifecycle(getMotion(motionMap, "title", "arc-entrance"), {
    sceneDurationFrames,
    staggerIndex: getStaggerIndex("title", 0),
  });

  const underlineLifecycle = useElementLifecycle("scale-x", {
    sceneDurationFrames,
    staggerIndex: getStaggerIndex("underline", 1),
    delayFrames: 5,
  });

  const taglineLifecycle = useElementLifecycle(getMotion(motionMap, "subtitle", "scale-fade"), {
    sceneDurationFrames,
    staggerIndex: getStaggerIndex("subtitle", 2),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center", alignItems: "center",
        padding: CONTENT_PAD, fontFamily: theme.typography.fontFamily,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: CONTENT_MAX_WIDTH }}>
        {/* Media/Logo — 标题上方 */}
        {mediaUrl && (
          <div style={{ marginBottom: 24 }}>
            <Img
              src={mediaUrl}
              style={{ height: 80, objectFit: "contain", borderRadius: 16, filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.4))" }}
            />
          </div>
        )}

        {title && (
          <div style={{
            ...titleLifecycle.style,
            fontSize: FONT_SIZE_TITLE, fontWeight: FONT_WEIGHT_TITLE,
            letterSpacing: theme.typography.titleLetterSpacing,
            textTransform: style.titleTransform, color: style.bodyColor,
            textShadow: style.titleShadow, marginBottom: GAP_TITLE_UNDERLINE,
            textAlign: "center", lineHeight: 1.1,
          }}>{title}</div>
        )}

        {showUnderline && (
          <div style={{
            ...underlineLifecycle.style,
            width: 200, height: UNDERLINE_HEIGHT,
            background: style.underlineBg, borderRadius: UNDERLINE_BORDER_RADIUS,
            marginBottom: GAP_UNDERLINE_TAGLINE,
            transformOrigin: "center left",
          }} />
        )}

        {subtitle && (
          <div style={{
            ...taglineLifecycle.style,
            fontSize: FONT_SIZE_TAGLINE, fontWeight: FONT_WEIGHT_TAGLINE,
            fontStyle: theme.effects?.italicForSubtitle ? "italic" : undefined,
            color: style.mutedColor, letterSpacing: 1,
            marginBottom: GAP_TAGLINE_POINTS, textAlign: "center",
            maxWidth: TEXT_MAX_WIDTH, lineHeight: 1.5,
          }}>{subtitle}</div>
        )}

        {(points ?? []).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: GAP_POINTS }}>
            {(points ?? []).map((point, i) => {
              const pointLifecycle = useElementLifecycle(getMotion(motionMap, "points", "spring-slide-up"), {
                sceneDurationFrames,
                staggerIndex: getStaggerIndex("points", 3) + i,
                staggerInterval: 5,
              });

              return (
                <div key={i} style={{
                  ...pointLifecycle.style,
                  fontSize: FONT_SIZE_POINTS, fontWeight: FONT_WEIGHT_POINTS,
                  lineHeight: 1.6, color: style.mutedColor,
                  display: "flex", alignItems: "center", gap: GAP_POINTS,
                }}>
                  {showBullet && (
                    <span style={{ display: "inline-block", width: DOT_SIZE, height: DOT_SIZE, borderRadius: "50%", backgroundColor: style.bulletColor, flexShrink: 0 }} />
                  )}
                  {point}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SFX — frame-accurate via wired MotionPreset.sfx */}
      {title && <SfxPlayer motion={getMotion(motionMap, "title", "arc-entrance")} staggerIndex={getStaggerIndex("title", 0)} />}
      {subtitle && <SfxPlayer motion={getMotion(motionMap, "subtitle", "scale-fade")} staggerIndex={getStaggerIndex("subtitle", 2)} />}
      {(points ?? []).map((_, i) => (
        <SfxPlayer key={i} motion={getMotion(motionMap, "points", "spring-slide-up")} staggerIndex={getStaggerIndex("points", 3) + i} />
      ))}
    </AbsoluteFill>
  );
};
