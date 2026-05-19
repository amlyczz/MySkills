/**
 * Intro.tsx — 开场片段（重构版）。
 *
 * 外部接口不变，内部使用新的样式/动效/布局抽象。
 * 三层叠加：动态背景 → 半透明遮罩 → HeroCenter 布局内容。
 *
 * Timeline (300 frames = 10s @ 30fps):
 *   F0–20:    Overlay fade in
 *   F20–75:   Title anticipate + arc
 *   F60–110:  Underline grow
 *   F80–130:  Tagline scale + fade
 *   F110–200: Points stagger (18-frame gap)
 *   F200+:    Stable display
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { styleTemplates } from "./styles";
import { resolveStyleTokens, extractBaseColor } from "./tokens";
import { BackgroundLayer, BgType } from "./backgrounds";
import { initFonts } from "./fonts";
import { HeroCenter } from "./layouts/HeroCenter";
import { defaultMotionMap } from "./motions";
import { TIMING } from "./animations";

initFonts();

export interface IntroProps {
  title: string;
  tagline: string;
  points: string[];
  themeIndex?: number;
  bgType?: BgType;
}

export const Intro: React.FC<IntroProps> = ({
  title,
  tagline,
  points,
  themeIndex = 0,
  bgType = "starfield",
}) => {
  const frame = useCurrentFrame();
  const theme = styleTemplates[themeIndex % styleTemplates.length];
  const bgBase = extractBaseColor(theme.colors.background);
  const tokens = resolveStyleTokens(theme);

  // Overlay fade in
  const overlayOpacity = interpolate(frame, TIMING.OVERLAY_FADE, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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

      {/* Layer 3: Content — HeroCenter layout */}
      <HeroCenter
        title={title}
        subtitle={tagline}
        points={points}
        style={tokens}
        theme={theme}
        motionMap={defaultMotionMap}
        showUnderline={true}
        showBullet={true}
      />
    </AbsoluteFill>
  );
};
