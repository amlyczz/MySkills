/**
 * VideoConfig.schema.ts — Zod schemas for runtime validation.
 *
 * Mirrors the TypeScript types in types.ts with Zod for:
 * - Runtime validation of LLM-generated VideoConfig JSON
 * - Enum locking to prevent hallucination
 * - Character limits to prevent layout overflow
 * - Export to JSON Schema for OpenAI Structured Outputs
 */
import { z } from "zod";

// ── Enum definitions (locked — LLM cannot invent values) ──

const zLayoutType = z.enum([
  "hero-center",
  "split-left-text",
  "split-right-text",
  "full-screen-text",
  "card-grid",
  "quote-style",
  "stat-highlight",
  "media-full",
  "code-display",
  "center-focus-video",
  "kinetic-typography",
  "floating-grid",
  "fly-through",
  "prompt-input",
  "sandwich-text",
]);

const zMotionType = z.enum([
  "spring-slide-up",
  "spring-slide-left",
  "arc-entrance",
  "scale-fade",
  "typewriter",
  "reveal-mask",
  "bounce-in",
  "blur-focus",
  "spring-elastic",
  "smooth-scale-up",
  "staggered-grow",
  "fade-out",
  "slide-out-left",
  "scale-down-out",
  "blur-out",
  "subtle-float",
  "glow-pulse",
  "none",
]);

const zSceneType = z.enum([
  "hook",
  "problem",
  "solution",
  "feature",
  "proof",
  "cta",
  "transition",
  "showcase",
]);

const zStyleFamily = z.enum(["tech", "business", "creative", "minimal", "playful"]);

const zBgType = z.enum([
  "starfield",
  "bokeh",
  "geometric",
  "pixel",
  "fluid-gradient",
  "none",
]);

const zBgmMood = z.enum([
  "epic",
  "upbeat",
  "chill",
  "tech",
  "cinematic",
  "corporate",
  "playful",
]);

const zTransitionType = z.enum([
  "none",
  "crossfade",
  "whip-pan",
  "slide-in",
  "slide-out",
]);

const zTransitionDirection = z.enum(["left", "right", "up", "down"]);

const zWrapperType = z.enum(["glow", "device-frame"]);

// ── Sub-schemas ──

const zHexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "must be a hex color like #RRGGBB");

const zBarChartItem = z.object({
  label: z.string(),
  value: z.number(),
  previousValue: z.number().optional(),
});

const zCameraAction = z.object({
  type: z.literal("pan-and-zoom"),
  targetScale: z.number().min(0.5).max(5),
  focusPoint: z.object({ x: z.number(), y: z.number() }),
  triggerFrame: z.number().int().min(0),
});

const zTransitionConfig = z.object({
  type: zTransitionType,
  direction: zTransitionDirection.optional(),
  durationFrames: z.number().int().min(1).max(60),
});

const zContent = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

const zSceneConfig = z.object({
  layoutId: zLayoutType,
  motionMap: z.record(z.string(), zMotionType),
  content: zContent,
  durationSeconds: z.number().int().min(1).max(300).optional(),
  chartData: z.array(zBarChartItem).optional(),
  cameraAction: zCameraAction.optional(),
  wrapperType: zWrapperType.optional(),
  transitionIn: zTransitionConfig.optional(),
  transitionOut: zTransitionConfig.optional(),
});

const zEnterPosition = z.discriminatedUnion("type", [
  z.object({ type: z.literal("translate"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("scale"), from: z.number() }),
  z.object({ type: z.literal("arc"), fromX: z.number(), fromY: z.number() }),
  z.object({ type: z.literal("mask"), direction: z.enum(["left", "right"]) }),
]);

const zSpringConfig = z.object({
  mass: z.number().min(0.1).max(5),
  damping: z.number().min(1).max(200),
  stiffness: z.number().min(1).max(300),
});

const zSfxBinding = z.object({
  src: z.string(),
  delay: z.number(),
  volume: z.number().min(0).max(1),
});

const zMotionPreset = z.object({
  id: z.string(),
  name: z.string(),
  entrance: z.object({
    springConfig: zSpringConfig,
    easingCurve: z.enum(["ease-out-expo", "ease-out-quart", "ease-in-out-cubic"]).optional(),
    delayFrames: z.number().int().min(0),
    durationFrames: z.number().int().min(1),
    enterFrom: zEnterPosition,
    staggerIndex: z.number().int().optional(),
    staggerFrames: z.number().int().optional(),
  }),
  idle: z
    .object({
      type: z.enum(["float", "glow", "none"]),
      amplitude: z.number().optional(),
      frequency: z.number().optional(),
    })
    .optional(),
  exit: z
    .object({
      type: z.enum(["fade-out", "slide-out", "scale-down", "blur-out"]),
      durationFrames: z.number().int().min(1),
    })
    .optional(),
  sfx: zSfxBinding.optional(),
});

const zVolumePoint = z.object({
  time: z.number().min(0),
  volume: z.number().min(0).max(1),
});

const zBgmTrack = z.object({
  id: z.string(),
  src: z.string(),
  bpm: z.number().optional(),
  mood: zBgmMood,
  volumeCurve: z.array(zVolumePoint).optional(),
});

const zVoiceoverSegment = z.object({
  sceneId: z.string(),
  elementRole: z.string(),
  src: z.string(),
  text: z.string(),
  durationSeconds: z.number().positive(),
  startOffsetSeconds: z.number().min(0),
});

const zAudioConfig = z.object({
  bgm: zBgmTrack.optional(),
  sfxEnabled: z.boolean(),
  voiceover: z.array(zVoiceoverSegment),
  voiceoverEnabled: z.boolean(),
});

// ── Root schema ──

export const videoConfigSchema = z.object({
  structureId: z.enum(["funnel", "timeline", "product-showcase", "performance-launch"]),
  styleId: z.string(),
  bgType: zBgType,
  sceneConfigs: z.record(z.string(), zSceneConfig),
  audio: zAudioConfig,
});

// ── Derived types ──

export type ZodVideoConfig = z.infer<typeof videoConfigSchema>;
export type ZodSceneConfig = z.infer<typeof zSceneConfig>;

// ── Additional content constraint schemas ──

/** Title: max 50 chars to prevent layout overflow */
export const zTitle = z.string().max(50, "title must not exceed 50 characters");

/** Subtitle: max 100 chars */
export const zSubtitle = z.string().max(100, "subtitle must not exceed 100 characters");

/** Points: max 6 items */
export const zPoints = z.array(z.string().max(80)).max(6, "max 6 bullet points");

/** Stats: max 40 chars */
export const zStats = z.string().max(40, "stats must not exceed 40 characters");

/** Scene content with layout constraints */
export const zSceneContent = z.object({
  title: zTitle.optional(),
  subtitle: zSubtitle.optional(),
  headline: zTitle.optional(),
  tagline: zSubtitle.optional(),
  points: zPoints.optional(),
  stats: zStats.optional(),
  summary: z.string().max(150).optional(),
  url: z.string().optional(),
  visual: z.string().optional(),
  code: z.string().optional(),
  language: z.string().optional(),
  codeAnimation: z.enum(["type", "fade", "scroll"]).optional(),
  staggerOrder: z.array(z.string()).optional(),
});
