/**
 * QuoteStyle — 引用式布局。
 *
 * 大引号标记 + 引用正文 + 署名。适合 proof / 社交证明场景。
 * subtitle 用作引用正文，title 用作署名。
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
import { useEntrance } from "../hooks/useEntrance";
import {
  CONTENT_PAD, CONTENT_MAX_WIDTH, FONT_SIZE_QUOTE_MARK,
  FONT_SIZE_QUOTE_BODY, FONT_SIZE_QUOTE_ATTR, FONT_WEIGHT_QUOTE_MARK,
  QUOTE_BODY_MAX_WIDTH, UNDERLINE_HEIGHT, UNDERLINE_MAX_WIDTH,
  UNDERLINE_BORDER_RADIUS, GAP_STAT_LABEL,
} from "../layout";
import { TIMING } from "../animations";

export const QuoteStyle: React.FC<LayoutProps> = ({
  title,
  subtitle,
  style,
  theme,
  motionMap,
  showUnderline = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Quote mark 动画 ──
  const markMotion = getMotion(motionMap, "title", "reveal-mask");
  const markStartFrame = TIMING.TITLE_INTRO[0];
  const markLocalFrame = Math.max(0, frame - markStartFrame);
  const markEntrance = useEntrance(markMotion, markLocalFrame);
  const markOpacity = interpolate(
    markLocalFrame,
    [0, 8],
    [0, 1],
    { extrapolateRight: "clamp" },
  );

  // ── Quote body 动画 ──
  const bodyMotion = getMotion(motionMap, "subtitle", "typewriter");
  const bodyStartFrame = TIMING.TAGLINE_INTRO[0];
  const bodyLocalFrame = Math.max(0, frame - bodyStartFrame);
  const bodyEntrance = useEntrance(bodyMotion, bodyLocalFrame);
  const bodyOpacity = interpolate(
    bodyLocalFrame,
    [0, 10],
    [0, 1],
    { extrapolateRight: "clamp" },
  );

  // ── Attribution 动画 ──
  const attrMotion = getMotion(motionMap, "summary", "scale-fade");
  const attrStartFrame = TIMING.SUMMARY_INTRO[0];
  const attrLocalFrame = Math.max(0, frame - attrStartFrame);
  const attrEntrance = useEntrance(attrMotion, attrLocalFrame);
  const attrOpacity = interpolate(
    attrLocalFrame,
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
    [0, UNDERLINE_MAX_WIDTH * 0.5],
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
        {/* Quote Mark */}
        <div
          style={{
            opacity: markOpacity,
            transform: markEntrance.transform,
            clipPath: markEntrance.clipPath,
            filter: markEntrance.filter,
            fontSize: FONT_SIZE_QUOTE_MARK,
            fontWeight: FONT_WEIGHT_QUOTE_MARK,
            color: theme.colors.accent,
            lineHeight: 0.8,
            alignSelf: "flex-start",
            marginLeft: 80,
            userSelect: "none",
          }}
        >
          "
        </div>

        {/* Quote Body */}
        {subtitle && (
          <div
            style={{
              opacity: bodyOpacity,
              transform: bodyEntrance.transform,
              clipPath: bodyEntrance.clipPath,
              filter: bodyEntrance.filter,
              fontSize: FONT_SIZE_QUOTE_BODY,
              fontWeight: 300,
              color: style.bodyColor,
              fontStyle: "italic",
              lineHeight: 1.6,
              textAlign: "center",
              maxWidth: QUOTE_BODY_MAX_WIDTH,
              marginTop: -40,
            }}
          >
            {subtitle}
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
              marginTop: GAP_STAT_LABEL,
              marginBottom: GAP_STAT_LABEL,
            }}
          />
        )}

        {/* Attribution */}
        {title && (
          <div
            style={{
              opacity: attrOpacity,
              transform: attrEntrance.transform,
              clipPath: attrEntrance.clipPath,
              filter: attrEntrance.filter,
              fontSize: FONT_SIZE_QUOTE_ATTR,
              fontWeight: 500,
              color: style.mutedColor,
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            — {title}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
