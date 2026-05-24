import type React from "react";
import type { TransitionType } from "../engine/types";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { TransitionPresentation } from "@remotion/transitions";

/**
 * Transition Registry
 * Maps Blueprint transition types to @remotion/transitions Presentation functions.
 */
export const transitionRegistry: Record<Exclude<TransitionType, "none">, () => TransitionPresentation<Record<string, unknown>>> = {
  "crossfade": () => fade(),
  "soft-replace": () => fade(),
  "spatial-shift": () => slide({ direction: "from-right" }),
  "stack-pop": () => fade(),
  "diagonal-wipe": () => wipe({ direction: "from-top-left" }),
};
