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
  SPRING_TITLE,
  SPRING_POINT,
  TIMING,
  ANTICIPATE_FRAMES,
} from "./animations";
import {
  CONTENT_PAD,
  CONTENT_MAX_WIDTH,
  TEXT_MAX_WIDTH,
  FONT_SIZE_TITLE,
  FONT_SIZE_TAGLINE,
  FONT_SIZE_POINTS,
  FONT_WEIGHT_TITLE,
  FONT_WEIGHT_TAGLINE,
  FONT_WEIGHT_POINTS,
  DOT_SIZE,
  UNDERLINE_HEIGHT,
  UNDERLINE_MAX_WIDTH,
  UNDERLINE_BORDER_RADIUS,
  GAP_TITLE_UNDERLINE,
  GAP_UNDERLINE_TAGLINE,
  GAP_TAGLINE_POINTS,
  GAP_POINTS,
} from "./layout";

initFonts();

export interface IntroProps {
  title: string;
  tagline: string;
  points: string[];
  themeIndex?: number;
  bgType?: BgType;
}

/**
 * Intro — Three-layer composition with top-tier typographic hierarchy.
 *
 * Timeline (300 frames = 10s @ 30fps):
 *   F0–20:    Overlay fade in
 *   F20–75:   Title anticipate + arc
 *   F60–110:  Underline grow
 *   F80–130:  Tagline scale + fade
 *   F110–200: Points stagger (18-frame gap)
 *   F200+:    Stable display
 */
export const Intro: React.FC<IntroProps> = ({
  title,
  tagline,
  points,
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

  // ── Title: anticipate + arc entrance ─────────────────────
  const titleStartFrame = TIMING.TITLE_INTRO[0];
  const titleFrame = Math.max(0, frame - titleStartFrame);

  const anticipateX = interpolate(titleFrame, [0, ANTICIPATE_FRAMES], [-5, 0], { extrapolateRight: "clamp" });
  const anticipateY = interpolate(titleFrame, [0, ANTICIPATE_FRAMES], [3, 0], { extrapolateRight: "clamp" });

  const titleSpring = spring({
    frame: Math.max(0, titleFrame - 2),
    fps,
    config: SPRING_TITLE,
  });

  const arcX = interpolate(titleSpring, [0, 1], [40, 0]);
  const arcY = interpolate(titleSpring, [0, 1], [60, 0]);
  const titleX = arcX + anticipateX;
  const titleY = arcY + anticipateY;
  const titleOpacity = interpolate(titleFrame, [0, ANTICIPATE_FRAMES], [0, 1], { extrapolateRight: "clamp" });

  // ── Underline: grow from center outward ──────────────────
  const underlineProgress = interpolate(frame, TIMING.UNDERLINE_GROW, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const underlineWidth = interpolate(underlineProgress, [0, 1], [0, UNDERLINE_MAX_WIDTH]);

  // ── Tagline: scale + fade ────────────────────────────────
  const taglineFrame = Math.max(0, frame - TIMING.TAGLINE_INTRO[0]);
  const taglineOpacity = interpolate(taglineFrame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineScale = interpolate(taglineFrame, [0, 15], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Points: staggered arc entry ─────────────────────────
  const pointElements = points.slice(0, 5).map((point: string, i: number) => {
    const pointStartFrame = TIMING.POINTS_START + i * TIMING.POINTS_STAGGER;
    const pointFrame = Math.max(0, frame - pointStartFrame);
    const pointSpring = spring({
      frame: pointFrame,
      fps,
      config: SPRING_POINT,
    });
    const angleSpread = (i - 2) * 12;
    const pX = interpolate(pointSpring, [0, 1], [-30 + angleSpread, 0]);
    const pY = interpolate(pointSpring, [0, 1], [35, 0]);
    return { point, i, spring: pointSpring, pX, pY };
  });

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

      {/* Layer 3: Content — Swiss-grid centered layout */}
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
          }}
        >
          {/* ── Title: hero text ── */}
          <div
            style={{
              opacity: titleOpacity,
              transform: `translate(${titleX}px, ${titleY}px)`,
              fontSize: FONT_SIZE_TITLE,
              fontWeight: FONT_WEIGHT_TITLE,
              letterSpacing: theme.titleLetterSpacing,
              textTransform: shouldUppercase(theme.name),
              color: theme.text,
              textShadow: titleShadow(theme.name, "intro"),
              marginBottom: GAP_TITLE_UNDERLINE,
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>

          {/* ── Underline: accent divider ── */}
          <div
            style={{
              width: underlineWidth,
              height: UNDERLINE_HEIGHT,
              background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
              borderRadius: UNDERLINE_BORDER_RADIUS,
              marginBottom: GAP_UNDERLINE_TAGLINE,
            }}
          />

          {/* ── Tagline: light supporting text ── */}
          <div
            style={{
              opacity: taglineOpacity,
              transform: `scale(${taglineScale})`,
              fontSize: FONT_SIZE_TAGLINE,
              fontWeight: FONT_WEIGHT_TAGLINE,
              fontStyle: theme.name === "dark-red" ? "italic" : undefined,
              color: theme.subtitle,
              letterSpacing: 1,
              marginBottom: GAP_TAGLINE_POINTS,
              textAlign: "center",
              maxWidth: TEXT_MAX_WIDTH,
              lineHeight: 1.5,
            }}
          >
            {tagline}
          </div>

          {/* ── Points: body text with accent dots ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: GAP_POINTS }}>
            {pointElements.map(({ point, i, spring: s, pX, pY }) => (
              <div
                key={i}
                style={{
                  opacity: s,
                  transform: `translate(${pX}px, ${pY}px)`,
                  fontSize: FONT_SIZE_POINTS,
                  fontWeight: FONT_WEIGHT_POINTS,
                  lineHeight: 1.6,
                  color: theme.points,
                  display: "flex",
                  alignItems: "center",
                  gap: GAP_POINTS,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: "50%",
                    backgroundColor: theme.accent,
                    flexShrink: 0,
                  }}
                />
                {point}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
