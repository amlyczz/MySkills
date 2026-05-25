import React from "react";
import { AbsoluteFill } from "remotion";
import { FluidAurora } from "./FluidAurora";
import { LightBeam } from "./LightBeam";
export const FluidShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0a0a0f" }}>
      {/* Layer 1: Fluid Aurora */}
      <FluidAurora intensity={1.5} />

      {/* Layer 2: Light beams */}
      <LightBeam />

      {/* Layer 3: Grain */}
      <AbsoluteFill style={{ zIndex: 10, mixBlendMode: "overlay", opacity: 0.05, pointerEvents: "none" }}>
        <svg width="100%" height="100%">
          <filter id="gshow"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#gshow)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
