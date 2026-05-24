import type React from "react";

// ── Background ──
export type BackgroundType =
  | "fluid-aurora" | "dark-neon" | "light-beam" | "tech-overlay"
  | "aurora-bg" | "fluid-background" | "noise-background"
  | "dot-grid-bg"
  | "none";

// ── Scene ──
export type SceneType =
  | "generic"
  | "intro" | "centered-statement" | "split-data-chart"
  | "split-ui-mockup" | "scrolling-graphic" | "outro";

// ── Component ──
export type ComponentType =
  // Layout
  | "browser-mockup" | "iphone-frame" | "split-layout" | "center-layout"
  | "pricing-stack" | "floating-card" | "coverflow-carousel" | "horizontal-carousel"
  | "layered-element" | "pop-up-book-base" | "icon-grid" | "split-media"
  // Content
  | "search-bar" | "ai-summary-box" | "pricing-card" | "memphis-card"
  | "data-bar-chart" | "animated-bar" | "video-card" | "product-card"
  | "agent-card" | "ui-card" | "minimal-card" | "mock-ui-card"
  | "experiment-card" | "flow-music-card" | "album-card"
  | "ios-list-item" | "ios-nav-bar" | "ios-status-bar"
  | "filter-pills" | "progress-ring" | "title" | "cta-button"
  | "stat-card" | "quote-card" | "callout-box" | "step-indicator"
  | "comparison-table" | "code-block" | "key-point" | "chapter-title"
  | "gradient-text" | "luxury-card" | "reveal-mask" | "stagger-reveal"
  | "glass-panel"
  // Text
  | "animated-text" | "text-block" | "word-swap-headline" | "typewriter"
  | "prompt-input" | "typing-input" | "subtitle-overlay" | "lower-third"
  | "number-counter"
  // Decoration
  | "cursor" | "decoration-overlay" | "dot-grid-bg" | "graphic-overlay"
  | "organic-blob" | "realistic-sphere" | "generating-pill"
  | "connection-line" | "scene-canvas" | "diagonal-wipe-transition"
  | "badge" | "ken-burns" | "cinematic-bars" | "mesh-gradient-bg"
  | "film-grain"
  // Media primitives (built-in, not from registry)
  | "text" | "image" | "video" | "shape" | "div"
  | "lottie";

// ── Animation ──
export type AnimationType =
  | "none" | "fade-in" | "fade-out" | "fade-up" | "fade-down"
  | "scale-in" | "scale-bounce"
  | "slide-left" | "slide-right" | "slide-up" | "slide-down"
  | "bar-grow" | "typewriter";

// ── Transition ──
export type TransitionType =
  | "none" | "crossfade" | "soft-replace" | "spatial-shift"
  | "stack-pop" | "diagonal-wipe";

// ── Motion Token ──
export interface MotionToken {
  easing: {
    type: "spring";
    params: { mass: number; damping: number; stiffness: number };
  } | {
    type: "bezier";
    bezier: [number, number, number, number];
  } | {
    type: "linear";
  };
  duration?: number; // default frames for this token
}

// ── Loop Animation ──
export interface LoopConfig {
  type: "pulse" | "float" | "spin" | "wiggle";
  durationInFrames: number; // one cycle
  amplitude?: number;        // 0-1, default 0.05
}

export interface AnimationConfig {
  type: AnimationType;
  timeline: {
    inFrame: number;
    outFrame?: number;
    duration?: number;
  };
  startState?: Record<string, number>;
  endState?: Record<string, number>;
  /** easing object, OR a motion token name (string look up in globalSettings.motionTokens) */
  easing?: {
    type: "spring" | "bezier" | "linear";
    params?: { mass?: number; damping?: number; stiffness?: number };
    bezier?: [number, number, number, number];
  } | string;
  /** Automatically stagger children entrance by delayPerChild frames */
  stagger?: {
    delayPerChild: number;
    direction?: "forward" | "reverse";
  };
  /** Continuous loop after entrance animation finishes */
  loop?: LoopConfig;
}

// ── Element ──
export interface ElementConfig {
  id: string;
  type: ComponentType;
  props?: Record<string, unknown>;
  layout?: {
    position?: "absolute" | "relative" | "flex-child";
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    zIndex?: number;
    /** Static transform (no animation, always applied as baseline) */
    scale?: number;
    rotation?: number;   // degrees
    opacity?: number;    // 0-1
  };
  /** Raw CSS overrides (for values Tailwind can't express dynamically) */
  style?: React.CSSProperties;
  animation?: AnimationConfig;
  /** Conditional rendering: string expression evaluated against data context */
  condition?: string;
  children?: ElementConfig[];
}

// ── Voiceover ──
export interface VoiceoverConfig {
  audioUrl: string;
  text: string;
  startFrame: number;
  endFrame?: number;
  volume?: number;
  loop?: boolean;
}

// ── Subtitles / Captions ──
export interface SubtitleToken {
  text: string;
  fromFrame: number;
  toFrame: number;
}

export interface SubtitleConfig {
  tokens?: SubtitleToken[];
  srtUrl?: string;
  captionsUrl?: string;
  highlightColor?: string;
  fontSize?: number;
}

// ── Sound Effects ──
export interface SfxConfig {
  library?: Record<string, string>;
}

export interface SfxTrigger {
  sfx: string;
  atFrame: number;
  /** "scene" (default) or "global" frame reference */
  frameOf?: "scene" | "global";
  volume?: number;
}

// ── Scene ──
export interface SceneConfig {
  id: string;
  type: SceneType;
  startFrame: number;
  durationInFrames: number;
  description?: string;
  background?: {
    type: BackgroundType;
    props?: Record<string, unknown>;
  } | null;
  style?: React.CSSProperties;
  transitionToNext?: {
    type: TransitionType;
    durationInFrames: number;
    props?: Record<string, unknown>;
  };
  elements?: ElementConfig[];
  props?: Record<string, unknown>;
  voiceover?: VoiceoverConfig;
  subtitles?: SubtitleConfig;
  sfx?: SfxTrigger[];
}

// ── Blueprint ──
export interface Blueprint {
  meta: {
    id: string;
    name: string;
    description?: string;
  };
  /** Shared data available to all scenes via $data.xxx references */
  data?: Record<string, unknown>;
  /** Template variables — drives UI form generation for user-facing params */
  variables?: {
    content: Array<{
      key: string;
      label: string;
      type: "string" | "number" | "image" | "textarea";
      default: unknown;
    }>;
    theme: Array<{
      key: string;
      label: string;
      type: "color" | "font";
      default: unknown;
    }>;
  };
  globalSettings: {
    /** Content safe area (for multi-resolution adaptation) */
    safeArea?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
      unit: "px" | "%";
    };
    theme: {
      colors: Record<string, string>;
      typography: {
        primaryFont: string;
        fallbackFont?: string;
        scales: Record<string, string>;
      };
      shape?: {
        radii?: Record<string, string>;
        shadows?: Record<string, string>;
      };
    };
    /** Named easing presets — referenced by AnimationConfig.easing string */
    motionTokens?: Record<string, MotionToken>;
    audio?: {
      bgmUrl?: string;
      bgmVolume?: number;
      sfx?: Record<string, string>;
      /** Auto-duck BGM when voiceover plays */
      ducking?: {
        enabled: boolean;
        duckToVolume?: number;
        fadeDurationFrames?: number;
      };
    };
  };
  globalBackground?: {
    type: BackgroundType;
    props?: Record<string, unknown>;
  };
  globalOverlays?: ElementConfig[];
  scenes: SceneConfig[];
}

// ── Helpers ──

/** Check if condition expression evaluates to true against a data context */
export function evalCondition(condition: string | undefined, data: Record<string, unknown>): boolean {
  if (!condition) return true;
  try {
    // Only allow safe operators: == != > < >= <= && ||
    const safe = condition.replace(/[^a-zA-Z0-9_$'"\s=!<>&|.]/g, "");
    const keys = Object.keys(data);
    const values = Object.values(data);
    const fn = new Function(...keys, `"use strict"; return (${safe});`);
    return Boolean(fn(...values));
  } catch {
    console.warn(`[evalCondition] Failed to evaluate: "${condition}"`);
    return true; // fail open
  }
}

/** Resolve $data.xxx references in props */
export function resolveDataRefs(props: Record<string, unknown> | undefined, data: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!props) return props;
  const resolved: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(props)) {
    if (typeof val === "string" && val.startsWith("$data.")) {
      const path = val.slice(6); // remove "$data."
      resolved[key] = path.split(".").reduce((obj: any, k) => obj?.[k], data) ?? val;
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      resolved[key] = resolveDataRefs(val as Record<string, unknown>, data);
    } else {
      resolved[key] = val;
    }
  }
  return resolved;
}

/** Calculate total frame count for a Blueprint rendered with TransitionSeries */
export function calculateTotalFrames(bp: Blueprint): number {
  const sorted = [...bp.scenes].sort((a, b) => a.startFrame - b.startFrame);
  let total = 0;
  for (let i = 0; i < sorted.length; i++) {
    total += sorted[i].durationInFrames;
    if (i < sorted.length - 1 && sorted[i].transitionToNext?.type && sorted[i].transitionToNext?.type !== "none") {
      total -= sorted[i].transitionToNext!.durationInFrames;
    }
  }
  return Math.max(1, total);
}
