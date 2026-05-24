import React from "react";
import { AbsoluteFill } from "remotion";

interface Props { opacity?: number; }

export const FilmGrain: React.FC<Props> = ({ opacity = 0.04 }) => (
  <AbsoluteFill className="pointer-events-none z-50" style={{ opacity, mixBlendMode: "overlay" }}>
    <svg width="100%" height="100%">
      <filter id="fgrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#fgrain)" />
    </svg>
  </AbsoluteFill>
);
