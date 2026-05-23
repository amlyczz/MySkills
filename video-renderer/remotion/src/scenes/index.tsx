/**
 * scenes/index.tsx — 6 个场景组件。
 *
 * 每个场景组件是对 SceneBase 的薄包装，预配置了布局和动效。
 * 外部通过 SceneConfig 覆盖默认配置。
 */
import React from "react";
import { SceneBase, SceneProps } from "./SceneBase";
import { LayoutType, MotionType, StyleTemplate } from "../types";
import { BgType } from "../backgrounds";
import { defaultMotionMap } from "../motions";

// ── 默认场景配置 ──

const hookDefaults = {
  layoutId: "hero-center" as LayoutType,
  motionMap: { ...defaultMotionMap, title: "bounce-in" as MotionType },
};

const problemDefaults = {
  layoutId: "hero-center" as LayoutType,
  motionMap: defaultMotionMap,
};

const solutionDefaults = {
  layoutId: "split-left-text" as LayoutType,
  motionMap: defaultMotionMap,
};

const featureDefaults = {
  layoutId: "hero-center" as LayoutType,
  motionMap: defaultMotionMap,
};

const showcaseDefaults = {
  layoutId: "media-full" as LayoutType,
  motionMap: { title: "none" as MotionType },
};

const ctaDefaults = {
  layoutId: "hero-center" as LayoutType,
  motionMap: defaultMotionMap,
};

const proofDefaults = {
  layoutId: "stat-highlight" as LayoutType,
  motionMap: { ...defaultMotionMap, stats: "scale-fade" as MotionType },
};

// ── 场景组件 ──

import type { CameraAction, BarChartItem, TransitionConfig } from "../types";

export interface SpecificSceneProps {
  content: Record<string, string | string[]>;
  chartData?: BarChartItem[];
  staggerOrder?: string[];
  cameraAction?: CameraAction;
  wrapperType?: "glow" | "device-frame";
  style: StyleTemplate;
  bgType: BgType;
  layoutId?: LayoutType;
  motionMap?: Record<string, MotionType>;
  transitionIn?: TransitionConfig;
  transitionOut?: TransitionConfig;
  sceneDurationFrames?: number;
}

/** 黄金三秒 */
export const HookScene: React.FC<SpecificSceneProps> = ({
  content, style, bgType, layoutId, motionMap, transitionIn, transitionOut, wrapperType, cameraAction, sceneDurationFrames,
}) => (
  <SceneBase
    content={content}
    style={style}
    bgType={bgType}
    layoutId={layoutId ?? hookDefaults.layoutId}
    motionMap={motionMap ?? hookDefaults.motionMap}
    transitionIn={transitionIn}
    transitionOut={transitionOut}
    showUnderline={false}
    showBullet={false}
    wrapperType={wrapperType}
    cameraAction={cameraAction}
    sceneDurationFrames={sceneDurationFrames}
  />
);

/** 痛点共鸣 */
export const ProblemScene: React.FC<SpecificSceneProps> = ({
  content, style, bgType, layoutId, motionMap, transitionIn, transitionOut, wrapperType, cameraAction, sceneDurationFrames,
}) => (
  <SceneBase
    content={content}
    style={style}
    bgType={bgType}
    layoutId={layoutId ?? problemDefaults.layoutId}
    motionMap={motionMap ?? problemDefaults.motionMap}
    transitionIn={transitionIn}
    transitionOut={transitionOut}
    wrapperType={wrapperType}
    cameraAction={cameraAction}
    sceneDurationFrames={sceneDurationFrames}
  />
);

/** 方案亮相 */
export const SolutionScene: React.FC<SpecificSceneProps> = ({
  content, style, bgType, layoutId, motionMap, transitionIn, transitionOut, wrapperType, cameraAction, sceneDurationFrames,
}) => (
  <SceneBase
    content={content}
    style={style}
    bgType={bgType}
    layoutId={layoutId ?? solutionDefaults.layoutId}
    motionMap={motionMap ?? solutionDefaults.motionMap}
    transitionIn={transitionIn}
    transitionOut={transitionOut}
    wrapperType={wrapperType}
    cameraAction={cameraAction}
    sceneDurationFrames={sceneDurationFrames}
  />
);

/** 功能亮点 */
export const FeatureScene: React.FC<SpecificSceneProps> = ({
  content, style, bgType, layoutId, motionMap, transitionIn, transitionOut, wrapperType, cameraAction, sceneDurationFrames,
}) => (
  <SceneBase
    content={content}
    style={style}
    bgType={bgType}
    layoutId={layoutId ?? featureDefaults.layoutId}
    motionMap={motionMap ?? featureDefaults.motionMap}
    transitionIn={transitionIn}
    transitionOut={transitionOut}
    wrapperType={wrapperType}
    cameraAction={cameraAction}
    sceneDurationFrames={sceneDurationFrames}
  />
);

/** 素材展示 */
export const ShowcaseScene: React.FC<SpecificSceneProps> = ({
  content, style, bgType, layoutId, motionMap, transitionIn, transitionOut, wrapperType, cameraAction, sceneDurationFrames,
}) => (
  <SceneBase
    content={content}
    style={style}
    bgType={bgType}
    layoutId={layoutId ?? showcaseDefaults.layoutId}
    motionMap={motionMap ?? showcaseDefaults.motionMap}
    transitionIn={transitionIn}
    transitionOut={transitionOut}
    showUnderline={false}
    showBullet={false}
    wrapperType={wrapperType}
    cameraAction={cameraAction}
    sceneDurationFrames={sceneDurationFrames}
  />
);

/** 行动呼吁 */
export const CtaScene: React.FC<SpecificSceneProps> = ({
  content, style, bgType, layoutId, motionMap, transitionIn, transitionOut, wrapperType, cameraAction, sceneDurationFrames,
}) => (
  <SceneBase
    content={content}
    style={style}
    bgType={bgType}
    layoutId={layoutId ?? ctaDefaults.layoutId}
    motionMap={motionMap ?? ctaDefaults.motionMap}
    transitionIn={transitionIn}
    transitionOut={transitionOut}
    showUnderline={true}
    showBullet={false}
    wrapperType={wrapperType}
    cameraAction={cameraAction}
    sceneDurationFrames={sceneDurationFrames}
  />
);

/** 数据证明 */
export const ProofScene: React.FC<SpecificSceneProps> = ({
  content, style, bgType, layoutId, motionMap, transitionIn, transitionOut, wrapperType, cameraAction, sceneDurationFrames,
}) => (
  <SceneBase
    content={content}
    style={style}
    bgType={bgType}
    layoutId={layoutId ?? proofDefaults.layoutId}
    motionMap={motionMap ?? proofDefaults.motionMap}
    transitionIn={transitionIn}
    transitionOut={transitionOut}
    showUnderline={true}
    showBullet={true}
    wrapperType={wrapperType}
    cameraAction={cameraAction}
    sceneDurationFrames={sceneDurationFrames}
  />
);

// ── 场景注册表 ──

export const sceneRegistry: Record<
  string,
  React.FC<SpecificSceneProps>
> = {
  hook: HookScene,
  problem: ProblemScene,
  solution: SolutionScene,
  feature: FeatureScene,
  showcase: ShowcaseScene,
  cta: CtaScene,
  proof: ProofScene,
};
