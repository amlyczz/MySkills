import { spring, interpolate, Easing } from "remotion";
import type { AnimationConfig, LoopConfig, MotionToken } from "./types";
import type React from "react";

export type AnimationFn = (
  frame: number,
  fps: number,
  config: AnimationConfig
) => React.CSSProperties;

/** Resolve easing from config — either inline object or motion token name */
function resolveEasing(
  config: AnimationConfig,
  motionTokens?: Record<string, MotionToken>,
): AnimationConfig["easing"] & object {
  const raw = config.easing;
  if (!raw) return { type: "spring", params: { mass: 1, damping: 14, stiffness: 100 } };
  if (typeof raw === "string") {
    const token = motionTokens?.[raw];
    if (token) return token.easing;
    console.warn(`[applyAnimation] Unknown motion token: "${raw}". Falling back to spring.`);
    return { type: "spring", params: { mass: 1, damping: 14, stiffness: 100 } };
  }
  return raw;
}

/** Compute loop style (pulse/float/spin/wiggle) independent of entrance animation */
function loopStyle(frame: number, fps: number, loop: LoopConfig): React.CSSProperties {
  const { type, durationInFrames, amplitude = 0.05 } = loop;
  const p = ((frame % durationInFrames) / durationInFrames) * Math.PI * 2; // 0 → 2π

  switch (type) {
    case "pulse":
      return { transform: `scale(${1 + Math.sin(p) * amplitude})` };
    case "float":
      return { transform: `translateY(${Math.sin(p) * amplitude * 20}px)` };
    case "spin":
      return { transform: `rotate(${(frame % durationInFrames) / durationInFrames * 360}deg)` };
    case "wiggle":
      return { transform: `rotate(${Math.sin(p) * amplitude * 10}deg)` };
    default:
      return {};
  }
}

/** Merge loop transform into existing react CSS transform string */
function mergeTransform(base: string | undefined, add: string): string {
  if (!base || base === "none") return add;
  return `${base} ${add}`;
}

/** Spring progress helper */
function springProgress(frame: number, fps: number, config: AnimationConfig, motionTokens?: Record<string, MotionToken>): number {
  const local = Math.max(0, frame - (config.timeline.inFrame ?? 0));
  const easing = resolveEasing(config, motionTokens);
  if (easing.type === "bezier" && "bezier" in easing) {
    const pct = interpolate(local, [0, config.timeline.duration ?? 30], [0, 1], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
      easing: typeof easing.bezier === "string"
        ? Easing.bezier(...(easing.bezier as unknown as [number, number, number, number]))
        : Easing.out(Easing.cubic),
    });
    return pct;
  }
  if (easing.type === "linear") {
    return interpolate(local, [0, config.timeline.duration ?? 30], [0, 1], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    });
  }
  // spring (default)
  const params = (easing as any).params ?? {};
  return spring({
    frame: local,
    fps,
    config: {
      mass: params.mass ?? 1,
      damping: params.damping ?? 14,
      stiffness: params.stiffness ?? 100,
    },
  });
}

function resolveProgress(frame: number, fps: number, config: AnimationConfig, motionTokens?: Record<string, MotionToken>): number {
  if (!config.easing || (typeof config.easing === "object" && config.easing.type === "spring")) {
    return springProgress(frame, fps, config, motionTokens);
  }
  return springProgress(frame, fps, config, motionTokens);
}

// ── Animation functions ──

const fadeIn: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  return { opacity: interpolate(p, [0, 1], [0, 1]) };
};

const fadeOut: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  return { opacity: interpolate(p, [0, 1], [1, 0]) };
};

const fadeUp: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  const startY = config.startState?.translateY ?? 40;
  const endY = config.endState?.translateY ?? 0;
  return {
    opacity: interpolate(p, [0, 1], [config.startState?.opacity ?? 0, config.endState?.opacity ?? 1]),
    transform: `translateY(${interpolate(p, [0, 1], [startY, endY])}px)`,
  };
};

const fadeDown: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  const startY = config.startState?.translateY ?? -40;
  const endY = config.endState?.translateY ?? 0;
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(p, [0, 1], [startY, endY])}px)`,
  };
};

const scaleIn: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  const startScale = config.startState?.scale ?? 0.8;
  const endScale = config.endState?.scale ?? 1;
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `scale(${interpolate(p, [0, 1], [startScale, endScale])})`,
  };
};

const scaleBounce: AnimationFn = (frame, fps, config) => {
  const cfg = { ...config, easing: { type: "spring" as const, params: { mass: 1.2, damping: 12, stiffness: 120, ...(typeof config.easing === "object" ? config.easing?.params : {}) } } };
  const p = resolveProgress(frame, fps, cfg);
  const startScale = config.startState?.scale ?? 0.85;
  const startY = config.startState?.translateY ?? 60;
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `scale(${interpolate(p, [0, 1], [startScale, 1])}) translateY(${interpolate(p, [0, 1], [startY, 0])}px)`,
  };
};

const slideLeft: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  const startX = config.startState?.translateX ?? 100;
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `translateX(${interpolate(p, [0, 1], [startX, 0])}px)`,
  };
};

const slideRight: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  const startX = config.startState?.translateX ?? -100;
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `translateX(${interpolate(p, [0, 1], [startX, 0])}px)`,
  };
};

const slideUp: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(p, [0, 1], [config.startState?.translateY ?? 80, 0])}px)`,
  };
};

const slideDown: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(p, [0, 1], [config.startState?.translateY ?? -80, 0])}px)`,
  };
};

const barGrow: AnimationFn = (frame, _fps, config) => {
  const inFrame = config.timeline.inFrame ?? 0;
  const duration = config.timeline.duration ?? 30;
  const local = Math.max(0, frame - inFrame);
  const p = interpolate(local, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return {
    transform: `scaleX(${p})`,
    transformOrigin: "left",
  };
};

const typewriterAnim: AnimationFn = () => ({});

const noneAnim: AnimationFn = () => ({});

// ── New animations from web-video-presentation methodology ──

/** Reveal: clip-path wipe from left to right */
const reveal: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  return {
    clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
  };
};

/** Stamp-drop: overshoot scale from 2.4 → 0.92 → 1 with rotation */
const stampDrop: AnimationFn = (frame, fps, config) => {
  const cfg = { ...config, easing: { type: "spring" as const, params: { mass: 1, damping: 10, stiffness: 100 } } };
  const p = resolveProgress(frame, fps, cfg);
  // Custom overshoot curve: scale goes 2.4 → 0.92 → 1.0
  const scale = p < 0.7
    ? interpolate(p, [0, 0.7], [2.4, 0.92], { extrapolateRight: "clamp" })
    : interpolate(p, [0.7, 1], [0.92, 1.0], { extrapolateRight: "clamp" });
  const rotation = interpolate(p, [0, 1], [-8, 0]);
  return {
    opacity: interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
    transform: `scale(${scale}) rotate(${rotation}deg)`,
  };
};

/** Brush-strike: horizontal line wipe with scaleX */
const brushStrike: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  return {
    transform: `scaleX(${p})`,
    transformOrigin: "left",
  };
};

/** Blur-in: blur 20px → 0 + opacity 0 → 1 */
const blurIn: AnimationFn = (frame, fps, config) => {
  const p = resolveProgress(frame, fps, config);
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    filter: `blur(${interpolate(p, [0, 1], [20, 0])}px)`,
  };
};

import type { AnimationType } from "../engine/types";

export const animationRegistry: Record<AnimationType, AnimationFn> = {
  "none": noneAnim,
  "fade-in": fadeIn,
  "fade-out": fadeOut,
  "fade-up": fadeUp,
  "fade-down": fadeDown,
  "scale-in": scaleIn,
  "scale-bounce": scaleBounce,
  "slide-left": slideLeft,
  "slide-right": slideRight,
  "slide-up": slideUp,
  "slide-down": slideDown,
  "bar-grow": barGrow,
  "typewriter": typewriterAnim,
  "reveal": reveal,
  "stamp-drop": stampDrop,
  "brush-strike": brushStrike,
  "blur-in": blurIn,
};

/**
 * Applies an animation config to produce CSSProperties for the current frame.
 * Also merges loop effects on top of entrance animation.
 * Motion tokens are resolved from the passed-in motionTokens map.
 */
export function applyAnimation(
  frame: number,
  fps: number,
  config?: AnimationConfig,
  motionTokens?: Record<string, MotionToken>,
): React.CSSProperties {
  if (!config || config.type === "none") {
    // Still apply loop if present
    if (config?.loop) {
      return loopStyle(frame, fps, config.loop);
    }
    return {};
  }

  const animFn = animationRegistry[config.type];
  if (!animFn) {
    console.warn(`[TemplateEngine] Unknown animation type: "${config.type}".`);
    return config.loop ? loopStyle(frame, fps, config.loop) : {};
  }

  // Resolve motion token if easing is a string
  const resolvedConfig = { ...config };
  if (typeof config.easing === "string" && motionTokens) {
    const token = motionTokens[config.easing];
    if (token) {
      resolvedConfig.easing = token.easing;
      if (token.duration && !resolvedConfig.timeline.duration) {
        resolvedConfig.timeline = { ...resolvedConfig.timeline, duration: token.duration };
      }
    }
  }

  const base = animFn(frame, fps, resolvedConfig);

  // Merge loop on top
  if (config.loop) {
    const lp = loopStyle(frame, fps, config.loop);
    base.transform = mergeTransform(base.transform as string | undefined, lp.transform as string);
  }

  return base;
}
