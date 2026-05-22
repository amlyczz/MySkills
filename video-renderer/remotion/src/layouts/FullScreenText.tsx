/**
 * FullScreenText — 全屏极简文字布局。
 *
 * 只显示 title + subtitle + body（如有），无下划线、无 bullet、无装饰卡片。
 * 使用 AbsoluteFill + flexbox 居中。
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { LayoutProps } from "../types";
import { getMotion } from "../motions";
import { useEntrance } from "../hooks/useEntrance";
import { SfxPlayer } from "../components/SfxPlayer";
import {
  CONTENT_PAD, CONTENT_MAX_WIDTH,
  FONT_SIZE_TITLE, FONT_SIZE_TAGLINE, FONT_SIZE_POINTS,
  FONT_WEIGHT_TITLE, FONT_WEIGHT_TAGLINE, FONT_WEIGHT_POINTS,
} from "../layout";
import { TIMING } from "../animations";

export const FullScreenText: React.FC<LayoutProps> = ({
  title,
  subtitle,
  body,
  style,
  theme,
  motionMap,
}) => {
  const titleMotion = getMotion(motionMap, "title", "arc-entrance");
  const subMotion = getMotion(motionMap, "subtitle", "scale-fade");
  const bodyMotion = getMotion(motionMap, "body", "spring-slide-up");

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
          textAlign: "center",
        }}
      >
        {title && (
          <FullScreenTitle
            title={title}
            motion={titleMotion}
            style={style}
            theme={theme}
          />
        )}
        {subtitle && (
          <FullScreenSubtitle
            subtitle={subtitle}
            motion={subMotion}
            style={style}
          />
        )}
        {body && (
          <FullScreenBody
            body={body}
            motion={bodyMotion}
            style={style}
          />
        )}
      </div>

      {title && <SfxPlayer motion={titleMotion} staggerIndex={0} />}
      {subtitle && <SfxPlayer motion={subMotion} staggerIndex={0} />}
      {body && <SfxPlayer motion={bodyMotion} staggerIndex={0} />}
    </AbsoluteFill>
  );
};

/* ── Internal sub-components ── */

import { useCurrentFrame } from "remotion";
import { StyleTokens, StyleTemplate, MotionPreset } from "../types";
import { staggerStartFrame } from "../hooks/useEntrance";

const FullScreenTitle: React.FC<{
  title: string;
  motion: MotionPreset;
  style: StyleTokens;
  theme: StyleTemplate;
}> = ({ title, motion, style, theme }) => {
  const frame = useCurrentFrame();
  const entrance = useEntrance(motion, Math.max(0, frame - TIMING.TITLE_INTRO[0]));
  return (
    <div
      style={{
        opacity: entrance.opacity,
        transform: entrance.transform,
        clipPath: entrance.clipPath,
        filter: entrance.filter,
        fontSize: FONT_SIZE_TITLE,
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
  );
};

const FullScreenSubtitle: React.FC<{
  subtitle: string;
  motion: MotionPreset;
  style: StyleTokens;
}> = ({ subtitle, motion, style }) => {
  const frame = useCurrentFrame();
  const entrance = useEntrance(motion, Math.max(0, frame - TIMING.TAGLINE_INTRO[0]));
  return (
    <div
      style={{
        opacity: entrance.opacity,
        transform: entrance.transform,
        clipPath: entrance.clipPath,
        filter: entrance.filter,
        fontSize: FONT_SIZE_TAGLINE,
        fontWeight: FONT_WEIGHT_TAGLINE,
        color: style.mutedColor,
        lineHeight: 1.5,
        marginBottom: 16,
      }}
    >
      {subtitle}
    </div>
  );
};

const FullScreenBody: React.FC<{
  body: string;
  motion: MotionPreset;
  style: StyleTokens;
}> = ({ body, motion, style }) => {
  const frame = useCurrentFrame();
  const entrance = useEntrance(motion, Math.max(0, frame - TIMING.POINTS_START));
  return (
    <div
      style={{
        opacity: entrance.opacity,
        transform: entrance.transform,
        clipPath: entrance.clipPath,
        filter: entrance.filter,
        fontSize: FONT_SIZE_POINTS,
        fontWeight: FONT_WEIGHT_POINTS,
        color: style.mutedColor,
        lineHeight: 1.6,
        maxWidth: "80%",
      }}
    >
      {body}
    </div>
  );
};
