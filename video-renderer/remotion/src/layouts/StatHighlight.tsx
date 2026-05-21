/**
 * StatHighlight — 大数字高亮布局。
 *
 * 中央展示超大数字（stats），下方标签（subtitle），
 * 可选标题和要点列表。适合 proof / 数据证明场景。
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
import {
  CONTENT_PAD, CONTENT_MAX_WIDTH, UNDERLINE_HEIGHT, UNDERLINE_MAX_WIDTH,
  UNDERLINE_BORDER_RADIUS, GAP_STAT_LABEL, GAP_TITLE_UNDERLINE,
  GAP_TAGLINE_POINTS, GAP_POINTS, DOT_SIZE, FONT_SIZE_STAT_BIG,
  FONT_SIZE_STAT_LABEL, FONT_WEIGHT_STAT_BIG, FONT_WEIGHT_STAT_LABEL,
  FONT_SIZE_POINTS, FONT_WEIGHT_POINTS,
} from "../layout";
import { TIMING } from "../animations";

export const StatHighlight: React.FC<LayoutProps> = ({
  title,
  subtitle,
  stats,
  points,
  style,
  theme,
  motionMap,
  showUnderline = true,
  showBullet = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Title 动画 ──
  const titleMotion = getMotion(motionMap, "title", "scale-fade");
  const titleStartFrame = TIMING.TITLE_INTRO[0];
  const titleLocalFrame = Math.max(0, frame - titleStartFrame);
  const titleEntrance = useEntrance(titleMotion, titleLocalFrame);
  const titleOpacity = interpolate(
    titleLocalFrame,
    [0, 10],
    [0, 1],
    { extrapolateRight: "clamp" },
  );

  // ── Stat 大数字动画 ──
  const statMotion = getMotion(motionMap, "stats", "scale-fade");
  const statStartFrame = TIMING.STATS_INTRO[0];
  const statLocalFrame = Math.max(0, frame - statStartFrame);
  const statEntrance = useEntrance(statMotion, statLocalFrame);
  const statOpacity = interpolate(
    statLocalFrame,
    [0, 12],
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

  // ── Label (subtitle) ──
  const labelMotion = getMotion(motionMap, "subtitle", "scale-fade");
  const labelStartFrame = TIMING.TAGLINE_INTRO[0];
  const labelLocalFrame = Math.max(0, frame - labelStartFrame);
  const labelEntrance = useEntrance(labelMotion, labelLocalFrame);
  const labelOpacity = interpolate(
    labelLocalFrame,
    [0, 12],
    [0, 1],
    { extrapolateRight: "clamp" },
  );

  // ── Points stagger ──
  const pointMotion = getMotion(motionMap, "points", "spring-slide-up");
  const pointElements = (points ?? []).slice(0, 5).map(
    (point: string, i: number) => {
      const pointStartFrame = staggerStartFrame(
        TIMING.POINTS_START,
        i,
        TIMING.POINTS_STAGGER,
      );
      const pointLocalFrame = Math.max(0, frame - pointStartFrame);
      const pointEntrance = useEntrance(pointMotion, pointLocalFrame);

      return { point, i, opacity: pointEntrance.opacity, transform: pointEntrance.transform };
    },
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
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: 1,
              color: style.mutedColor,
              marginBottom: GAP_TITLE_UNDERLINE,
              textAlign: "center",
            }}
          >
            {title}
          </div>
        )}

        {/* Stat Big Number */}
        {stats && (
          <div
            style={{
              opacity: statOpacity,
              transform: statEntrance.transform,
              clipPath: statEntrance.clipPath,
              filter: statEntrance.filter,
              fontSize: FONT_SIZE_STAT_BIG,
              fontWeight: FONT_WEIGHT_STAT_BIG,
              color: style.bodyColor,
              textShadow: style.titleShadow,
              letterSpacing: -2,
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            {stats}
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

        {/* Label (subtitle) */}
        {subtitle && (
          <div
            style={{
              opacity: labelOpacity,
              transform: labelEntrance.transform,
              clipPath: labelEntrance.clipPath,
              filter: labelEntrance.filter,
              fontSize: FONT_SIZE_STAT_LABEL,
              fontWeight: FONT_WEIGHT_STAT_LABEL,
              color: style.mutedColor,
              letterSpacing: 1,
              textAlign: "center",
              maxWidth: 600,
              lineHeight: 1.5,
              marginBottom: GAP_TAGLINE_POINTS,
            }}
          >
            {subtitle}
          </div>
        )}

        {/* Points */}
        {pointElements.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: GAP_POINTS,
            }}
          >
            {pointElements.map(({ point, i, opacity, transform }) => (
              <div
                key={i}
                style={{
                  opacity,
                  transform,
                  fontSize: FONT_SIZE_POINTS,
                  fontWeight: FONT_WEIGHT_POINTS,
                  lineHeight: 1.6,
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
            ))}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
