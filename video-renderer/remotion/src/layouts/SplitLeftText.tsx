/**
 * SplitLeftText — 左右分栏布局。
 *
 * 左侧 1/3 文案 + 右侧 2/3 素材/留白。
 * 适合 solution / feature 等需要图文并排的场景。
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { LayoutProps, MotionType, MotionPreset } from "../types";
import { defaultMotionMap, getMotion } from "../motions";
import { useEntrance, staggerStartFrame } from "../hooks/useEntrance";
import {
  CONTENT_PAD, TEXT_MAX_WIDTH, GAP_POINTS, DOT_SIZE,
  FONT_SIZE_TITLE, FONT_SIZE_TAGLINE, FONT_SIZE_POINTS,
  FONT_WEIGHT_TITLE, FONT_WEIGHT_TAGLINE, FONT_WEIGHT_POINTS,
} from "../layout";
import { TIMING } from "../animations";

export const SplitLeftText: React.FC<LayoutProps> = ({
  title,
  subtitle,
  points,
  mediaUrl,
  style,
  theme,
  motionMap,
  showBullet = true,
}) => {
  const frame = useCurrentFrame();

  // ── Title ──
  const titleMotion = getMotion(motionMap, "title", "arc-entrance");
  const titleEntrance = useEntrance(titleMotion, Math.max(0, frame - TIMING.TITLE_INTRO[0]));

  // ── Subtitle ──
  const subMotion = getMotion(motionMap, "subtitle", "scale-fade");
  const subEntrance = useEntrance(subMotion, Math.max(0, frame - TIMING.TAGLINE_INTRO[0]));

  // ── Points ──
  const pointMotion = getMotion(motionMap, "points", "spring-slide-up");
  const pointElements = (points ?? []).slice(0, 5).map((point, i) => {
    const startFrame = staggerStartFrame(TIMING.POINTS_START, i, TIMING.POINTS_STAGGER);
    const entrance = useEntrance(pointMotion, Math.max(0, frame - startFrame));
    return { point, i, opacity: entrance.opacity, transform: entrance.transform, clipPath: entrance.clipPath, filter: entrance.filter };
  });

  return (
    <AbsoluteFill style={{ display: "flex", padding: CONTENT_PAD }}>
      {/* 左侧 1/3 文案 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingRight: 40,
        }}
      >
        {title && (
          <div
            style={{
              opacity: titleEntrance.opacity,
              transform: titleEntrance.transform,
              clipPath: titleEntrance.clipPath,
              filter: titleEntrance.filter,
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
              opacity: subEntrance.opacity,
              transform: subEntrance.transform,
              clipPath: subEntrance.clipPath,
              filter: subEntrance.filter,
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

        {pointElements.length > 0 && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: GAP_POINTS }}
          >
            {pointElements.map(({ point, i, opacity, transform, clipPath, filter }) => (
              <div
                key={i}
                style={{
                  opacity,
                  transform,
                  clipPath,
                  filter,
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
            ))}
          </div>
        )}
      </div>

      {/* 右侧 2/3 素材/留白 */}
      <div
        style={{
          flex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {mediaUrl && (
          <img
            src={mediaUrl}
            alt=""
            style={{
              maxWidth: "100%",
              maxHeight: "80%",
              borderRadius: theme.decoration.borderRadius,
              objectFit: "contain",
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
