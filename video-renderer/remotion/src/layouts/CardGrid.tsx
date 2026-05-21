/**
 * CardGrid — 卡片网格布局。
 *
 * 将 points 数组渲染为多列卡片。每张卡片展示一条文本。
 * 卡片依次 stagger 入场。适合 feature / 功能亮点场景。
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { LayoutProps, MotionType, MotionPreset } from "../types";
import { getMotion } from "../motions";
import { useEntrance, staggerStartFrame } from "../hooks/useEntrance";
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
import { TIMING } from "../animations";

export const CardGrid: React.FC<LayoutProps> = ({
  title,
  subtitle,
  points,
  style,
  theme,
  motionMap,
  showUnderline = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Title ──
  const titleMotion = getMotion(motionMap, "title", "arc-entrance");
  const titleLocalFrame = Math.max(0, frame - TIMING.TITLE_INTRO[0]);
  const titleEntrance = useEntrance(titleMotion, titleLocalFrame);
  const titleOpacity = interpolate(
    titleLocalFrame,
    [0, 10],
    [0, 1],
    { extrapolateRight: "clamp" },
  );

  // ── Underline ──
  const underlineProgress = interpolate(
    frame,
    TIMING.UNDERLINE_GROW,
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const underlineWidth = interpolate(
    underlineProgress,
    [0, 1],
    [0, UNDERLINE_MAX_WIDTH],
  );

  // ── Subtitle ──
  const subMotion = getMotion(motionMap, "subtitle", "scale-fade");
  const subLocalFrame = Math.max(0, frame - TIMING.TAGLINE_INTRO[0]);
  const subEntrance = useEntrance(subMotion, subLocalFrame);
  const subOpacity = interpolate(
    subLocalFrame,
    [0, 12],
    [0, 1],
    { extrapolateRight: "clamp" },
  );

  // ── Cards stagger ──
  const cardMotion = getMotion(motionMap, "points", "spring-slide-up");
  const cards = (points ?? []).slice(0, 6).map((text: string, i: number) => {
    const startFrame = staggerStartFrame(TIMING.POINTS_START, i, TIMING.POINTS_STAGGER);
    const localFrame = Math.max(0, frame - startFrame);
    const entrance = useEntrance(cardMotion, localFrame);
    return { text, i, opacity: entrance.opacity, transform: entrance.transform };
  });

  // 卡片网格：最多 3 列
  const columns = Math.min(cards.length, 3);

  // 卡片背景色：从主题 surface 色 + alpha
  const cardBg = hexToRgba(
    theme.colors.surface,
    CARD_BG_ALPHA,
  );

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
              opacity: titleOpacity,
              transform: titleEntrance.transform,
              clipPath: titleEntrance.clipPath,
              filter: titleEntrance.filter,
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
              width: underlineWidth,
              height: UNDERLINE_HEIGHT,
              background: style.underlineBg,
              borderRadius: UNDERLINE_BORDER_RADIUS,
              marginBottom: GAP_UNDERLINE_TAGLINE,
            }}
          />
        )}

        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              opacity: subOpacity,
              transform: subEntrance.transform,
              clipPath: subEntrance.clipPath,
              filter: subEntrance.filter,
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
        {cards.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: CARD_GAP,
            }}
          >
            {cards.map(({ text, i, opacity, transform }) => (
              <div
                key={i}
                style={{
                  opacity,
                  transform,
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
            ))}
          </div>
        )}
      </div>

      {/* SFX */}
      {title && <SfxPlayer motion={titleMotion} staggerIndex={0} />}
      {subtitle && <SfxPlayer motion={subMotion} staggerIndex={0} />}
      {cards.map((_, i) => (
        <SfxPlayer key={i} motion={cardMotion} staggerIndex={i} />
      ))}
    </AbsoluteFill>
  );
};
