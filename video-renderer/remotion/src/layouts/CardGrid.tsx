import React from "react";
import { AbsoluteFill } from "remotion";
import { LayoutProps } from "../types";
import { getMotion } from "../motions";
import { useElementLifecycle } from "../hooks/useElementLifecycle";
import { hexToRgba } from "../tokens";
import { SfxPlayer } from "../components/SfxPlayer";
import {
  CONTENT_PAD, CONTENT_MAX_WIDTH, GAP_TITLE_UNDERLINE,
  UNDERLINE_HEIGHT, UNDERLINE_MAX_WIDTH, UNDERLINE_BORDER_RADIUS,
  CARD_GAP, CARD_PADDING, CARD_BORDER_RADIUS, CARD_BG_ALPHA,
  FONT_SIZE_CARD, FONT_WEIGHT_CARD, CARD_MAX_WIDTH,
  FONT_SIZE_TITLE, FONT_WEIGHT_TITLE, FONT_SIZE_TAGLINE,
  FONT_WEIGHT_TAGLINE, GAP_UNDERLINE_TAGLINE,
} from "../layout";

export const CardGrid: React.FC<LayoutProps> = ({
  title,
  subtitle,
  points,
  style,
  theme,
  motionMap,
  showUnderline = true,
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

  // ── Underline ──
  const underlineLifecycle = useElementLifecycle("scale-x", {
    sceneDurationFrames,
    staggerIndex: getStaggerIndex("underline", 1),
    delayFrames: 5,
  });

  // ── Subtitle ──
  const subLifecycle = useElementLifecycle(getMotion(motionMap, "subtitle", "scale-fade"), {
    sceneDurationFrames,
    staggerIndex: getStaggerIndex("subtitle", 2),
  });

  const cardBg = hexToRgba(theme.colors.surface, CARD_BG_ALPHA);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: CONTENT_PAD,
        fontFamily: theme.typography.fontFamily,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: CONTENT_MAX_WIDTH,
        }}
      >
        {/* Title */}
        {title && (
          <div
            style={{
              ...titleLifecycle.style,
              fontSize: FONT_SIZE_TITLE,
              fontWeight: FONT_WEIGHT_TITLE,
              letterSpacing: theme.typography.titleLetterSpacing,
              textTransform: style.titleTransform,
              color: style.bodyColor,
              textShadow: style.titleShadow,
              marginBottom: GAP_TITLE_UNDERLINE,
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
        )}

        {/* Underline */}
        {showUnderline && (
          <div
            style={{
              ...underlineLifecycle.style,
              width: UNDERLINE_MAX_WIDTH,
              height: UNDERLINE_HEIGHT,
              background: style.underlineBg,
              borderRadius: UNDERLINE_BORDER_RADIUS,
              marginBottom: GAP_UNDERLINE_TAGLINE,
              transformOrigin: "center left",
            }}
          />
        )}

        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              ...subLifecycle.style,
              fontSize: FONT_SIZE_TAGLINE,
              fontWeight: FONT_WEIGHT_TAGLINE,
              color: style.mutedColor,
              letterSpacing: 1,
              marginBottom: 40,
              textAlign: "center",
              maxWidth: 600,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>
        )}

        {/* Card Grid */}
        {(points ?? []).length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: CARD_GAP,
            }}
          >
            {(points ?? []).slice(0, 6).map((text, i) => {
              const cardLifecycle = useElementLifecycle(getMotion(motionMap, "points", "spring-slide-up"), {
                sceneDurationFrames,
                staggerIndex: getStaggerIndex("points", 3) + i,
                staggerInterval: 8,
              });

              return (
                <div
                  key={i}
                  style={{
                    ...cardLifecycle.style,
                    width: CARD_MAX_WIDTH,
                    padding: CARD_PADDING,
                    background: cardBg,
                    borderRadius: CARD_BORDER_RADIUS,
                    borderLeft: `3px solid ${theme.colors.accent}`,
                    fontSize: FONT_SIZE_CARD,
                    fontWeight: FONT_WEIGHT_CARD,
                    lineHeight: 1.5,
                    color: style.bodyColor,
                    boxShadow: `0 4px 24px rgba(0,0,0,0.2)`,
                  }}
                >
                  {text}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SFX */}
      {title && <SfxPlayer motion={getMotion(motionMap, "title", "arc-entrance")} staggerIndex={getStaggerIndex("title", 0)} />}
      {subtitle && <SfxPlayer motion={getMotion(motionMap, "subtitle", "scale-fade")} staggerIndex={getStaggerIndex("subtitle", 2)} />}
      {(points ?? []).slice(0, 6).map((_, i) => (
        <SfxPlayer key={i} motion={getMotion(motionMap, "points", "spring-slide-up")} staggerIndex={getStaggerIndex("points", 3) + i} />
      ))}
    </AbsoluteFill>
  );
};
