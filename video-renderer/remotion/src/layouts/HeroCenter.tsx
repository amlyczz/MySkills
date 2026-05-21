/**
 * HeroCenter — 居中单列布局。
 *
 * Title → Underline → Subtitle → Points
 * 动画逻辑已提取到 hooks/useHero{Title,Underline,Tagline,Points}.ts
 */
import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { LayoutProps, MotionType } from "../types";
import { getMotion } from "../motions";
import { getSfxByMotion } from "../audio/sfxLibrary";
import { useHeroTitle } from "../hooks/useHeroTitle";
import { useHeroUnderline } from "../hooks/useHeroUnderline";
import { useHeroTagline } from "../hooks/useHeroTagline";
import { useHeroPoints } from "../hooks/useHeroPoints";
import {
  CONTENT_PAD, CONTENT_MAX_WIDTH, TEXT_MAX_WIDTH,
  UNDERLINE_HEIGHT, UNDERLINE_BORDER_RADIUS,
  GAP_TITLE_UNDERLINE, GAP_UNDERLINE_TAGLINE, GAP_TAGLINE_POINTS, GAP_POINTS,
  DOT_SIZE, FONT_SIZE_TITLE, FONT_SIZE_TAGLINE, FONT_SIZE_POINTS,
  FONT_WEIGHT_TITLE, FONT_WEIGHT_TAGLINE, FONT_WEIGHT_POINTS,
} from "../layout";

export const HeroCenter: React.FC<LayoutProps> = ({
  title, subtitle, points, style, theme, motionMap,
  showUnderline = true, showBullet = true,
}) => {
  const titleAnim = useHeroTitle(motionMap);
  const underlineAnim = useHeroUnderline();
  const taglineAnim = useHeroTagline(motionMap);
  const pointElements = useHeroPoints(motionMap, points ?? []);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center", alignItems: "center",
        padding: CONTENT_PAD, fontFamily: theme.typography.fontFamily,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: CONTENT_MAX_WIDTH }}>
        {title && (
          <div style={{
            opacity: titleAnim.opacity, transform: titleAnim.transform,
            clipPath: titleAnim.clipPath, filter: titleAnim.filter,
            fontSize: FONT_SIZE_TITLE, fontWeight: FONT_WEIGHT_TITLE,
            letterSpacing: theme.typography.titleLetterSpacing,
            textTransform: style.titleTransform, color: style.bodyColor,
            textShadow: style.titleShadow, marginBottom: GAP_TITLE_UNDERLINE,
            textAlign: "center", lineHeight: 1.1,
          }}>{title}</div>
        )}

        {showUnderline && (
          <div style={{
            width: underlineAnim.width, height: UNDERLINE_HEIGHT,
            background: style.underlineBg, borderRadius: UNDERLINE_BORDER_RADIUS,
            marginBottom: GAP_UNDERLINE_TAGLINE,
          }} />
        )}

        {subtitle && (
          <div style={{
            opacity: taglineAnim.opacity, transform: taglineAnim.transform,
            clipPath: taglineAnim.clipPath, filter: taglineAnim.filter,
            fontSize: FONT_SIZE_TAGLINE, fontWeight: FONT_WEIGHT_TAGLINE,
            fontStyle: theme.effects?.italicForSubtitle ? "italic" : undefined,
            color: style.mutedColor, letterSpacing: 1,
            marginBottom: GAP_TAGLINE_POINTS, textAlign: "center",
            maxWidth: TEXT_MAX_WIDTH, lineHeight: 1.5,
          }}>{subtitle}</div>
        )}

        {pointElements.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: GAP_POINTS }}>
            {pointElements.map(({ point, i, opacity, transform, clipPath, filter }) => (
              <div key={i} style={{
                opacity, transform, clipPath, filter,
                fontSize: FONT_SIZE_POINTS, fontWeight: FONT_WEIGHT_POINTS,
                lineHeight: 1.6, color: style.mutedColor,
                display: "flex", alignItems: "center", gap: GAP_POINTS,
              }}>
                {showBullet && (
                  <span style={{ display: "inline-block", width: DOT_SIZE, height: DOT_SIZE, borderRadius: "50%", backgroundColor: style.bulletColor, flexShrink: 0 }} />
                )}
                {point}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SFX */}
      {title && getSfxByMotion(motionMap["title"] ?? "arc-entrance") && (
        <Audio src={staticFile(getSfxByMotion(motionMap["title"] ?? "arc-entrance")!.src)} volume={getSfxByMotion(motionMap["title"] ?? "arc-entrance")!.defaultVolume} />
      )}
      {subtitle && getSfxByMotion(motionMap["subtitle"] ?? "scale-fade") && (
        <Audio src={staticFile(getSfxByMotion(motionMap["subtitle"] ?? "scale-fade")!.src)} volume={getSfxByMotion(motionMap["subtitle"] ?? "scale-fade")!.defaultVolume} />
      )}
      {(points ?? []).slice(0, 5).map((_, i) => {
        const sfx = getSfxByMotion(motionMap["points"] ?? "spring-slide-up");
        return sfx ? <Audio key={`sfx-${i}`} src={staticFile(sfx.src)} volume={sfx.defaultVolume * 0.6} startFrom={120 + i * 18} /> : null;
      })}
    </AbsoluteFill>
  );
};
