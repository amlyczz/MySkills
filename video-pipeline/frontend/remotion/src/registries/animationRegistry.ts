import { spring, interpolate, Easing } from "remotion";
import type { AnimationConfig } from "../engine/types";
import type React from "react";

export type AnimationFn = (
  frame: number,
  fps: number,
  config: AnimationConfig
) => React.CSSProperties;

/** Helper: resolve spring progress from config */
function springProgress(frame: number, fps: number, config: AnimationConfig): number {
  const localFrame = Math.max(0, frame - (config.timeline.inFrame ?? 0));
  const params = config.easing?.params ?? {};
  return spring({
    frame: localFrame,
    fps,
    config: {
      mass: params.mass ?? 1,
      damping: params.damping ?? 14,
      stiffness: params.stiffness ?? 100,
    },
  });
}

/** Helper: resolve linear progress from config */
function linearProgress(frame: number, config: AnimationConfig): number {
  const inFrame = config.timeline.inFrame ?? 0;
  const duration = config.timeline.duration ?? 30;
  const localFrame = Math.max(0, frame - inFrame);
  return interpolate(localFrame, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

function resolveProgress(frame: number, fps: number, config: AnimationConfig): number {
  if (config.easing?.type === "spring" || !config.easing) {
    return springProgress(frame, fps, config);
  }
  return linearProgress(frame, config);
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
  const cfg = { ...config, easing: { type: "spring" as const, params: { mass: 1.2, damping: 12, stiffness: 120, ...config.easing?.params } } };
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
  const localFrame = Math.max(0, frame - inFrame);
  const p = interpolate(localFrame, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return {
    transform: `scaleX(${p})`,
    transformOrigin: "left",
  };
};

const typewriterAnim: AnimationFn = () => {
  // Typewriter is handled by the Typewriter component itself, not via CSS
  return {};
};

const none: AnimationFn = () => ({});

import type { AnimationType } from "../engine/types";

export const animationRegistry: Record<AnimationType, AnimationFn> = {
  "none": none,
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
};
