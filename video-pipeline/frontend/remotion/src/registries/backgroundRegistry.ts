import type React from "react";
import { FluidAurora } from "../backgrounds/FluidAurora";
import { DarkNeonBg } from "../backgrounds/DarkNeonBg";
import { LightBeam } from "../backgrounds/LightBeam";
import { TechOverlay } from "../backgrounds/TechOverlay";
import { AuroraBg } from "../components/decoration/AuroraBg";
import { FluidBackground } from "../components/decoration/FluidBackground";
import { DotGridBg } from "../components/decoration/DotGridBg";
import { NoiseBackground } from "../components/decoration/NoiseBackground";
import type { BackgroundType } from "../engine/types";

export const backgroundRegistry: Record<Exclude<BackgroundType, "none">, React.FC<any>> = {
  "fluid-aurora": FluidAurora,
  "dark-neon": DarkNeonBg,
  "light-beam": LightBeam,
  "tech-overlay": TechOverlay,
  "aurora-bg": AuroraBg,
  "fluid-background": FluidBackground,
  "dot-grid-bg": DotGridBg,
  "noise-background": NoiseBackground,
};
