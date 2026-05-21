/**
 * SceneBase.tsx — 场景通用外壳。
 *
 * 每个场景 = 三层叠加（背景 → 遮罩 → 内容布局）。
 * 所有具体场景组件复用此外壳。
 */
import React from "react";
import {
  AbsoluteFill,
  Video,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { StyleTemplate, StyleTokens, LayoutType, MotionType, TransitionConfig } from "../types";
import { resolveStyleTokens, extractBaseColor } from "../tokens";
import { BackgroundLayer, BgType } from "../backgrounds";
import { LayoutDispatcher } from "../layouts";
import { WhipPanTransition } from "../components/WhipPanTransition";
import { TIMING } from "../animations";

export interface SceneProps {
  /** 场景内容 */
  content: Record<string, string | string[]>;
  /** 样式模板 */
  style: StyleTemplate;
  /** 背景动效类型 */
  bgType: BgType;
  /** 布局选择 */
  layoutId: LayoutType;
  /** 元素角色 → 动效类型的映射 */
  motionMap: Record<string, MotionType>;
  /** 显示下划线 */
  showUnderline?: boolean;
  /** 显示列表圆点 */
  showBullet?: boolean;
  /** Transition INTO this scene */
  transitionIn?: TransitionConfig;
  /** Transition OUT of this scene */
  transitionOut?: TransitionConfig;
}

export const SceneBase: React.FC<SceneProps> = ({
  content,
  style,
  bgType,
  layoutId,
  motionMap,
  showUnderline = true,
  showBullet = true,
  transitionIn,
  transitionOut: _transitionOut,
}) => {
  const frame = useCurrentFrame();
  const tokens = resolveStyleTokens(style);
  const bgBase = extractBaseColor(style.colors.background);

  // Overlay fade in
  const overlayOpacity = interpolate(frame, TIMING.OVERLAY_FADE, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Transition: incoming animation ──
  let transitionWrap: React.ReactNode = null;
  const hasTransition = transitionIn && transitionIn.type !== "none";

  const contentElement = (
    <LayoutDispatcher
      layoutId={layoutId}
      title={
        typeof content.headline === "string"
          ? content.headline
          : typeof content.title === "string"
          ? content.title
          : undefined
      }
      subtitle={
        typeof content.subtitle === "string"
          ? content.subtitle
          : typeof content.tagline === "string"
          ? content.tagline
          : undefined
      }
      points={Array.isArray(content.points) ? content.points : undefined}
      stats={typeof content.stats === "string" ? content.stats : undefined}
      mediaUrl={
        typeof content.visual === "string" ? content.visual : undefined
      }
      code={typeof content.code === "string" ? content.code : undefined}
      language={typeof content.language === "string" ? content.language : undefined}
      codeAnimation={
        typeof content.codeAnimation === "string"
          ? (content.codeAnimation as "type" | "fade" | "scroll")
          : undefined
      }
      style={tokens}
      theme={style}
      motionMap={motionMap}
      showUnderline={showUnderline}
      showBullet={showBullet}
    />
  );

  if (hasTransition) {
    const ti = transitionIn!;
    if (ti.type === "crossfade") {
      const fadeOpacity = interpolate(frame, [0, ti.durationFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      transitionWrap = <div style={{ opacity: fadeOpacity }}>{contentElement}</div>;
    } else if (ti.type === "whip-pan") {
      transitionWrap = (
        <WhipPanTransition
          direction={ti.direction ?? "left"}
          durationFrames={ti.durationFrames}
        >
          {contentElement}
        </WhipPanTransition>
      );
    } else if (ti.type === "slide-in") {
      const dir = ti.direction ?? "left";
      const axis = dir === "left" || dir === "right" ? "X" : "Y";
      const from = dir === "left" || dir === "up" ? 120 : -120;
      const offset = interpolate(frame, [0, ti.durationFrames], [from, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const opacity = interpolate(frame, [0, ti.durationFrames], [0.3, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      transitionWrap = (
        <div
          style={{
            opacity,
            transform: `translate${axis}(${offset}px)`,
          }}
        >
          {contentElement}
        </div>
      );
    } else if (ti.type === "slide-out") {
      // slide-out as incoming: slide from opposite direction
      const dir = ti.direction ?? "left";
      const oppositeDir = dir === "left" ? "right" : dir === "right" ? "left" : dir === "up" ? "down" : "up";
      const axis = oppositeDir === "left" || oppositeDir === "right" ? "X" : "Y";
      const from = oppositeDir === "left" || oppositeDir === "up" ? 120 : -120;
      const offset = interpolate(frame, [0, ti.durationFrames], [from, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      transitionWrap = (
        <div
          style={{
            transform: `translate${axis}(${offset}px)`,
          }}
        >
          {contentElement}
        </div>
      );
    }
  }

  return (
    <AbsoluteFill>
      {/* Layer 0: Video background (P2 — overrides programmatic bg) */}
      {style.backgroundVideoUrl && (
        <AbsoluteFill>
          <Video src={style.backgroundVideoUrl} loop style={{ opacity: 0.8, filter: "saturate(1.5)", objectFit: "cover" }} />
        </AbsoluteFill>
      )}

      {/* Layer 1: Dynamic background */}
      <BackgroundLayer
        bgType={bgType}
        primaryColor={style.colors.accent}
        accentColor={style.colors.textMuted}
        bgColor={bgBase}
      />

      {/* Layer 2: Semi-transparent overlay */}
      <AbsoluteFill
        style={{
          background: tokens.overlayBg,
          opacity: overlayOpacity,
        }}
      />

      {/* Layer 3: Content — Layout dispatcher (with optional transition wrap) */}
      {hasTransition ? transitionWrap : contentElement}
    </AbsoluteFill>
  );
};
