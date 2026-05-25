import type React from "react";
import type { TransitionType } from "../engine/types";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { TransitionPresentation } from "@remotion/transitions";

/**
 * Custom presentation: Soft Replace
 *   Exit: opacity 1 → 0
 *   Enter: opacity 0 → 1
 *   Smoother than crossfade — enter only starts after exit begins.
 */
function softReplacePresentation(): TransitionPresentation<Record<string, unknown>> {
  return {
    enterStyle: { opacity: 0 },
    enter: ({ progress }) => ({ opacity: progress }),
    exitStyle: { opacity: 1 },
    exit: ({ progress }) => ({ opacity: 1 - progress }),
  };
}

/**
 * Custom presentation: Spatial Shift
 *   Exit: translateX 0 → -30% + slight opacity drop
 *   Enter: translateX 60px → 0 + opacity 0 → 1
 *   Spring-driven spatial displacement.
 */
function spatialShiftPresentation(): TransitionPresentation<Record<string, unknown>> {
  return {
    enterStyle: { opacity: 0, transform: "translateX(60px)" },
    enter: ({ progress }) => ({
      opacity: progress,
      transform: `translateX(${(1 - progress) * 60}px)`,
    }),
    exitStyle: { opacity: 1, transform: "translateX(0)" },
    exit: ({ progress }) => ({
      opacity: 0.85 + 0.15 * (1 - progress),
      transform: `translateX(${-(1 - progress) * 30}%)`,
    }),
  };
}

/**
 * Custom presentation: Stack Pop-in
 *   New layer appears on top with scale + translateY spring.
 *   Exit: no exit animation (old layer stays behind).
 *   Enter: translateY 30px → 0, scale 0.95 → 1, opacity 0 → 1.
 */
function stackPopPresentation(): TransitionPresentation<Record<string, unknown>> {
  return {
    enterStyle: { opacity: 0, transform: "translateY(30px) scale(0.95)" },
    enter: ({ progress }) => ({
      opacity: progress,
      transform: `translateY(${(1 - progress) * 30}px) scale(${0.95 + 0.05 * progress})`,
    }),
    exitStyle: { opacity: 1 },
    exit: ({ progress }) => ({
      opacity: 1 - progress * 0.3,
    }),
  };
}

/**
 * Transition Registry
 * Maps Blueprint transition types to @remotion/transitions Presentation functions.
 */
export const transitionRegistry: Record<Exclude<TransitionType, "none">, () => TransitionPresentation<Record<string, unknown>>> = {
  "crossfade": () => fade(),
  "soft-replace": () => softReplacePresentation(),
  "spatial-shift": () => spatialShiftPresentation(),
  "stack-pop": () => stackPopPresentation(),
  "diagonal-wipe": () => wipe({ direction: "from-top-left" }),
};
