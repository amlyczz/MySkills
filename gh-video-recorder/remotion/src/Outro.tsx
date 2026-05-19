/**
 * Outro.tsx — 结尾片段（重构版）。
 *
 * 外部接口不变，内部使用新的样式/动效/布局抽象。
 * 三层叠加：动态背景 → 半透明遮罩 → 居中内容。
 *
 * Timeline (300 frames = 10s @ 30fps):
 *   F0–20:    Overlay fade in
 *   F20–75:   URL spring entrance
 *   F60–110:  Stats fade
 *   F90–140:  Underline grow
 *   F120–180: Summary fade + translateY
 *   F180+:    Stable display
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { styleTemplates } from "./styles";
import { resolveStyleTokens, extractBaseColor } from "./tokens";
import { BackgroundLayer, BgType } from "./backgrounds";
import { initFonts } from "./fonts";
import { motionPresets } from "./motions";
import { useEntrance } from "./hooks/useEntrance";
import { StyleTemplate, StyleTokens } from "./types";
import {
  CONTENT_PAD,
  CONTENT_MAX_WIDTH,
  TEXT_MAX_WIDTH,
  FONT_SIZE_URL,
  FONT_SIZE_STATS,
  FONT_SIZE_SUMMARY,
  FONT_WEIGHT_URL,
  FONT_WEIGHT_STATS,
  FONT_WEIGHT_SUMMARY,
  UNDERLINE_HEIGHT,
  UNDERLINE_BORDER_RADIUS,
  OUTRO_UNDERLINE_MAX_WIDTH,
  GAP_URL_STATS,
  GAP_STATS_UNDERLINE,
} from "./layout";
import { TIMING } from "./animations";

initFonts();

export interface OutroProps {
  url: string;
  stats: string;
  summary: string;
  themeIndex?: number;
  bgType?: BgType;
}

export const Outro: React.FC<OutroProps> = ({
  url,
  stats,
  summary,
  themeIndex = 0,
  bgType = "starfield",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = styleTemplates[themeIndex % styleTemplates.length];
  const bgBase = extractBaseColor(theme.colors.background);
  const tokens = resolveStyleTokens(theme);

  // Overlay fade in
  const overlayOpacity = interpolate(frame, TIMING.OVERLAY_FADE, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── URL: spring entrance ──
  const urlMotion = motionPresets["spring-slide-up"];
  const urlLocalFrame = Math.max(0, frame - TIMING.URL_INTRO[0]);
  const urlEntrance = useEntrance(urlMotion, urlLocalFrame);

  // ── Stats: fade in ──
  const statsFrame = Math.max(0, frame - TIMING.STATS_INTRO[0]);
  const statsOpacity = interpolate(statsFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Underline: grow from center ──
  const underlineProgress = interpolate(
    frame,
    TIMING.OUTRO_UNDERLINE_GROW,
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const underlineWidth = interpolate(
    underlineProgress,
    [0, 1],
    [0, OUTRO_UNDERLINE_MAX_WIDTH],
  );

  // ── Summary: fade + translateY ──
  const summaryMotion = motionPresets["spring-slide-up"];
  const summaryLocalFrame = Math.max(0, frame - TIMING.SUMMARY_INTRO[0]);
  const summaryEntrance = useEntrance(summaryMotion, summaryLocalFrame);

  return (
    <AbsoluteFill>
      {/* Layer 1: Dynamic background */}
      <BackgroundLayer
        bgType={bgType}
        primaryColor={theme.colors.accent}
        accentColor={theme.colors.textMuted}
        bgColor={bgBase}
      />

      {/* Layer 2: Semi-transparent overlay */}
      <AbsoluteFill
        style={{
          background: tokens.overlayBg,
          opacity: overlayOpacity,
        }}
      />

      {/* Layer 3: Content */}
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
            textAlign: "center",
          }}
        >
          {/* URL */}
          <div
            style={{
              opacity: urlEntrance.opacity,
              transform: urlEntrance.transform,
              fontSize: FONT_SIZE_URL,
              fontWeight: FONT_WEIGHT_URL,
              letterSpacing: theme.id === "matte-metal" ? 2 : 0,
              textTransform: tokens.titleTransform,
              color: tokens.bodyColor,
              textShadow: tokens.titleShadow,
              marginBottom: GAP_URL_STATS,
            }}
          >
            {url}
          </div>

          {/* Stats */}
          <div
            style={{
              opacity: statsOpacity,
              fontSize: FONT_SIZE_STATS,
              fontWeight: FONT_WEIGHT_STATS,
              color: theme.colors.accent,
              letterSpacing: 2,
              marginBottom: GAP_STATS_UNDERLINE,
            }}
          >
            {stats}
          </div>

          {/* Underline */}
          <div
            style={{
              width: underlineWidth,
              height: theme.id === "dark-red" ? 1 : 2,
              background: tokens.underlineBg,
              borderRadius:
                theme.id === "dark-red" ? 0 : UNDERLINE_BORDER_RADIUS,
              marginBottom: GAP_STATS_UNDERLINE,
            }}
          />

          {/* Summary */}
          <div
            style={{
              opacity: summaryEntrance.opacity,
              transform: summaryEntrance.transform,
              fontSize: FONT_SIZE_SUMMARY,
              fontWeight: FONT_WEIGHT_SUMMARY,
              color: tokens.mutedColor,
              maxWidth: TEXT_MAX_WIDTH,
              lineHeight: 1.8,
              fontStyle: theme.effects?.italicForSubtitle
                ? "italic"
                : undefined,
            }}
          >
            {summary}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
