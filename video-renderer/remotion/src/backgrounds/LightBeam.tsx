import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

interface Beam {
  /** frame to start appearing */
  atFrame: number;
  /** beam angle in degrees */
  angle: number;
  /** how fast it sweeps */
  speed: number;
  /** horizontal offset (0 = center) */
  offsetX: number;
}

const BEAMS: Beam[] = [
  { atFrame: 80, angle: -50, speed: 0.3, offsetX: -200 },
  { atFrame: 320, angle: -30, speed: -0.25, offsetX: 150 },
  { atFrame: 500, angle: -45, speed: 0.35, offsetX: -100 },
  { atFrame: 700, angle: -55, speed: -0.2, offsetX: 200 },
  { atFrame: 900, angle: -40, speed: 0.28, offsetX: -50 },
];

export const LightBeam: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 5 }}>
      {BEAMS.map((beam, i) => {
        const elapsed = frame - beam.atFrame;
        if (elapsed < -10 || elapsed > 40) return null;

        const opacity = interpolate(elapsed, [0, 10, 30, 40], [0, 0.7, 0.7, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

        const translateY = interpolate(elapsed, [0, 40], [-400, 400]) * beam.speed;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              background: `linear-gradient(${90 + beam.angle}deg, transparent 0%, rgba(255,255,255,${opacity * 0.4}) 45%, rgba(255,255,255,${opacity * 0.8}) 50%, rgba(255,255,255,${opacity * 0.4}) 55%, transparent 100%)`,
              opacity,
              transform: `translateY(${translateY}px) translateX(${beam.offsetX}px)`,
              filter: "blur(60px)",
              width: "300%",
              height: "25%",
              top: "40%",
              left: "-100%",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
