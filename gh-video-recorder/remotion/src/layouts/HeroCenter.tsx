/**
 * HeroCenter — 居中单列布局。
 *
 * 当前 Intro/Outro 使用的布局：所有内容垂直居中排列。
 * Title → Underline → Subtitle → Points
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { LayoutProps, MotionType, MotionPreset } from "../types";
import { motionPresets } from "../motions";
import { useEntrance, staggerStartFrame } from "../hooks/useEntrance";
import { getSfxByMotion } from "../audio/sfxLibrary";

/** 安全地从 motionMap 获取 MotionPreset */
function getMotion(
  map: Record<string, MotionType>,
  key: string,
  fallback: MotionType,
): MotionPreset {
  return motionPresets[map[key] ?? fallback];
}
import {
  CONTENT_PAD,
  CONTENT_MAX_WIDTH,
  TEXT_MAX_WIDTH,
  UNDERLINE_HEIGHT,
  UNDERLINE_MAX_WIDTH,
  UNDERLINE_BORDER_RADIUS,
  GAP_TITLE_UNDERLINE,
  GAP_UNDERLINE_TAGLINE,
  GAP_TAGLINE_POINTS,
  GAP_POINTS,
  DOT_SIZE,
  FONT_SIZE_TITLE,
  FONT_SIZE_TAGLINE,
  FONT_SIZE_POINTS,
  FONT_WEIGHT_TITLE,
  FONT_WEIGHT_TAGLINE,
  FONT_WEIGHT_POINTS,
} from "../layout";
import { TIMING, ANTICIPATE_FRAMES } from "../animations";

export const HeroCenter: React.FC<LayoutProps> = ({
  title,
  subtitle,
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
  const titleMotion = getMotion(motionMap, "title", "arc-entrance");
  const titleStartFrame = TIMING.TITLE_INTRO[0];
  const titleLocalFrame = Math.max(0, frame - titleStartFrame);

  // anticipate 微反向位移
  const anticipateX = interpolate(
    titleLocalFrame,
    [0, ANTICIPATE_FRAMES],
    [-5, 0],
    { extrapolateRight: "clamp" },
  );
  const anticipateY = interpolate(
    titleLocalFrame,
    [0, ANTICIPATE_FRAMES],
    [3, 0],
    { extrapolateRight: "clamp" },
  );

  const titleEntrance = useEntrance(titleMotion, titleLocalFrame);
  const titleOpacity = interpolate(
    titleLocalFrame,
    [0, ANTICIPATE_FRAMES],
    [0, 1],
    { extrapolateRight: "clamp" },
  );

  // 合并 anticipate 位移与 arc 入场
  const titleTransform =
    titleMotion.entrance.enterFrom.type === "arc" ||
    titleMotion.entrance.enterFrom.type === "translate"
      ? titleEntrance.transform
          .replace(/translate\(([^,]+),\s*([^)]+)\)/, (_: string, x: string, y: string) => {
            const nx = parseFloat(x) + anticipateX;
            const ny = parseFloat(y) + anticipateY;
            return `translate(${nx}px, ${ny}px)`;
          })
      : titleEntrance.transform;

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

  // ── Subtitle / Tagline ──
  const taglineMotion = getMotion(motionMap, "subtitle", "scale-fade");
  const taglineStartFrame = TIMING.TAGLINE_INTRO[0];
  const taglineLocalFrame = Math.max(0, frame - taglineStartFrame);
  const taglineEntrance = useEntrance(taglineMotion, taglineLocalFrame);

  // scale-fade 特殊处理：直接用 scale 而非 transform
  const isTaglineScaleFade =
    (motionMap["subtitle"] ?? "scale-fade") === "scale-fade";
  const taglineOpacity = isTaglineScaleFade
    ? interpolate(taglineLocalFrame, [0, 15], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : taglineEntrance.opacity;
  const taglineScale = isTaglineScaleFade
    ? interpolate(taglineLocalFrame, [0, 15], [0.95, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  const taglineTransform = isTaglineScaleFade
    ? `scale(${taglineScale})`
    : taglineEntrance.transform;

  // ── Points stagger ──
  const pointMotion = getMotion(motionMap, "points", "spring-slide-up");
  const maxPoints = 5;
  const pointElements = (points ?? []).slice(0, maxPoints).map(
    (point: string, i: number) => {
      const pointStartFrame = staggerStartFrame(
        TIMING.POINTS_START,
        i,
        TIMING.POINTS_STAGGER,
      );
      const pointLocalFrame = Math.max(0, frame - pointStartFrame);
      const pointEntrance = useEntrance(pointMotion, pointLocalFrame);

      // arc 类型需要角度展开
      let pTransform = pointEntrance.transform;
      if (pointMotion.entrance.enterFrom.type === "arc") {
        const angleSpread = (i - 2) * 12;
        const arcEf = pointMotion.entrance.enterFrom as {
          type: "arc";
          fromX: number;
          fromY: number;
        };
        const prog = pointEntrance.progress;
        const spreadX = interpolate(prog, [0, 1], [-30 + angleSpread, 0]);
        const spreadY = interpolate(prog, [0, 1], [arcEf.fromY, 0]);
        pTransform = `translate(${spreadX}px, ${spreadY}px)`;
      }

      return { point, i, opacity: pointEntrance.opacity, transform: pTransform, clipPath: pointEntrance.clipPath, filter: pointEntrance.filter };
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
              transform: titleTransform,
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

        {/* Subtitle / Tagline */}
        {subtitle && (
          <div
            style={{
              opacity: taglineOpacity,
              transform: taglineTransform,
              clipPath: taglineEntrance.clipPath,
              filter: taglineEntrance.filter,
              fontSize: FONT_SIZE_TAGLINE,
              fontWeight: FONT_WEIGHT_TAGLINE,
              fontStyle: theme.effects?.italicForSubtitle
                ? "italic"
                : undefined,
              color: style.mutedColor,
              letterSpacing: 1,
              marginBottom: GAP_TAGLINE_POINTS,
              textAlign: "center",
              maxWidth: TEXT_MAX_WIDTH,
              lineHeight: 1.5,
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

      {/* SFX — 标题入场音效 */}
      {title && (() => {
        const sfx = getSfxByMotion(motionMap["title"] ?? "arc-entrance");
        return sfx ? (
          <Audio src={staticFile(sfx.src)} volume={sfx.defaultVolume} />
        ) : null;
      })()}

      {/* SFX — 副标题入场音效 */}
      {subtitle && (() => {
        const sfx = getSfxByMotion(motionMap["subtitle"] ?? "scale-fade");
        return sfx ? (
          <Audio src={staticFile(sfx.src)} volume={sfx.defaultVolume} />
        ) : null;
      })()}

      {/* SFX — 要点列表入场音效（每个 stagger 项触发一次） */}
      {(points ?? []).slice(0, 5).map((_, i) => {
        const sfx = getSfxByMotion(motionMap["points"] ?? "spring-slide-up");
        if (!sfx) return null;
        return (
          <Audio
            key={`sfx-point-${i}`}
            src={staticFile(sfx.src)}
            volume={sfx.defaultVolume * 0.6}
            startFrom={TIMING.POINTS_START + i * TIMING.POINTS_STAGGER}
          />
        );
      })}
    </AbsoluteFill>
  );
};
