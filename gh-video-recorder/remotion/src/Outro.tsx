import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { themes } from "./themes";
import { BackgroundLayer, BgType } from "./backgrounds";
import { initFonts } from "./fonts";
import { extractBaseColor, overlayGradient, titleShadow, shouldUppercase } from "./tokens";
import {
  SPRING_URL,
  SPRING_BODY,
  TIMING,
} from "./animations";
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
  UNDERLINE_BORDER_RADIUS,
  OUTRO_UNDERLINE_MAX_WIDTH,
  GAP_URL_STATS,
  GAP_STATS_UNDERLINE,
} from "./layout";

initFonts();

export interface OutroProps {
  url: string;
  stats: string;
  summary: string;
  themeIndex?: number;
  bgType?: BgType;
}

/**
 * Outro — Three-layer composition with distinct typographic hierarchy.
 *
 * Timeline (300 frames = 10s @ 30fps):
 *   F0–20:    Overlay fade in
 *   F20–75:   URL spring entrance
 *   F60–110:  Stats fade
 *   F90–140:  Underline grow
 *   F120–180: Summary fade + translateY
 *   F180+:    Stable display
 */
export const Outro: React.FC<OutroProps> = ({
  url,
  stats,
  summary,
  themeIndex = 0,
  bgType = "starfield",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = themes[themeIndex % themes.length];
  const bgBase = extractBaseColor(theme.bg);

  // ── Overlay fade in ──────────────────────────────────────
  const overlayOpacity = interpolate(frame, TIMING.OVERLAY_FADE, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── URL: spring entrance ─────────────────────────────────
  const urlFrame = Math.max(0, frame - TIMING.URL_INTRO[0]);
  const urlSpring = spring({
    frame: urlFrame,
    fps,
    config: SPRING_URL,
  });
  const urlY = interpolate(urlSpring, [0, 1], [50, 0]);
  const urlOpacity = interpolate(urlFrame, [0, 3], [0, 1], { extrapolateRight: "clamp" });

  // ── Stats: fade in ───────────────────────────────────────
  const statsFrame = Math.max(0, frame - TIMING.STATS_INTRO[0]);
  const statsOpacity = interpolate(statsFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Underline: grow from center ──────────────────────────
  const underlineProgress = interpolate(frame, TIMING.OUTRO_UNDERLINE_GROW, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const underlineWidth = interpolate(underlineProgress, [0, 1], [0, OUTRO_UNDERLINE_MAX_WIDTH]);

  // ── Summary: fade + translateY ───────────────────────────
  const summaryFrame = Math.max(0, frame - TIMING.SUMMARY_INTRO[0]);
  const summarySpring = spring({
    frame: summaryFrame,
    fps,
    config: SPRING_BODY,
  });
  const summaryY = interpolate(summarySpring, [0, 1], [20, 0]);
  const summaryOpacity = interpolate(summaryFrame, [0, 9], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Layer 1: Dynamic background */}
      <BackgroundLayer
        bgType={bgType}
        primaryColor={theme.accent}
        accentColor={theme.subtitle}
        bgColor={bgBase}
      />

      {/* Layer 2: Semi-transparent overlay */}
      <AbsoluteFill
        style={{
          background: overlayGradient(theme),
          opacity: overlayOpacity,
        }}
      />

      {/* Layer 3: Content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: CONTENT_PAD,
          fontFamily: theme.fontFamily,
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
          {/* ── URL: hero text ── */}
          <div
            style={{
              opacity: urlOpacity,
              transform: `translateY(${urlY}px)`,
              fontSize: FONT_SIZE_URL,
              fontWeight: FONT_WEIGHT_URL,
              letterSpacing: theme.name === "matte-metal" ? 2 : 0,
              textTransform: shouldUppercase(theme.name),
              color: theme.text,
              textShadow: titleShadow(theme.name, "outro"),
              marginBottom: GAP_URL_STATS,
            }}
          >
            {url}
          </div>

          {/* ── Stats: accent highlighted ── */}
          <div
            style={{
              opacity: statsOpacity,
              fontSize: FONT_SIZE_STATS,
              fontWeight: FONT_WEIGHT_STATS,
              color: theme.accent,
              letterSpacing: 2,
              marginBottom: GAP_STATS_UNDERLINE,
            }}
          >
            {stats}
          </div>

          {/* ── Underline: accent divider ── */}
          <div
            style={{
              width: underlineWidth,
              height: theme.name === "dark-red" ? 1 : 2,
              background: `linear-gradient(90deg, transparent, ${theme.divider}, transparent)`,
              borderRadius: theme.name === "dark-red" ? 0 : UNDERLINE_BORDER_RADIUS,
              marginBottom: GAP_STATS_UNDERLINE,
            }}
          />

          {/* ── Summary: muted body text ── */}
          <div
            style={{
              opacity: summaryOpacity,
              transform: `translateY(${summaryY}px)`,
              fontSize: FONT_SIZE_SUMMARY,
              fontWeight: FONT_WEIGHT_SUMMARY,
              color: theme.subtitle,
              maxWidth: TEXT_MAX_WIDTH,
              lineHeight: 1.8,
              fontStyle: theme.name === "dark-red" ? "italic" : undefined,
            }}
          >
            {summary}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
