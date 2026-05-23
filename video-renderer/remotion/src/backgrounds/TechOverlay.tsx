import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";

const FPS = 24;

// Crosshair positions (deterministic grid)
const CROSSHAIRS = Array.from({ length: 18 }, (_, i) => ({
  x: `${15 + ((i * 137) % 70)}%` as const,
  y: `${10 + ((i * 251) % 80)}%` as const,
  size: 12 + (i % 3) * 6,
  appearFrame: 240 + i * 8,
}));

const CIRCLES = [
  { cx: "50%", cy: "50%", r: 180, appearFrame: 260, strokeWidth: 1 },
  { cx: "50%", cy: "50%", r: 280, appearFrame: 275, strokeWidth: 0.5 },
  { cx: "50%", cy: "50%", r: 400, appearFrame: 290, strokeWidth: 0.3 },
];

const GRID_LINES = 8;

export const TechOverlay: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 6, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080">
        {/* Horizontal grid lines */}
        {Array.from({ length: GRID_LINES }, (_, i) => {
          const yPct = 10 + i * 10;
          const lineOpacity = interpolate(frame, [300 + i * 10, 320 + i * 10], [0, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          return (
            <line key={`h${i}`} x1={0} y1={`${yPct}%`} x2="100%" y2={`${yPct}%`}
              stroke="rgba(255,255,255,0.5)" strokeWidth={0.5} opacity={lineOpacity} />
          );
        })}
        {/* Vertical grid lines */}
        {Array.from({ length: GRID_LINES }, (_, i) => {
          const xPct = 10 + i * 10;
          const lineOpacity = interpolate(frame, [305 + i * 10, 325 + i * 10], [0, 0.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          return (
            <line key={`v${i}`} x1={`${xPct}%`} y1={0} x2={`${xPct}%`} y2="100%"
              stroke="rgba(255,255,255,0.4)" strokeWidth={0.5} opacity={lineOpacity} />
          );
        })}

        {/* Circles */}
        {CIRCLES.map((c, i) => {
          const circleSpring = spring({ frame: Math.max(0, frame - c.appearFrame), fps: FPS, config: { mass: 1, damping: 20, stiffness: 120 } });
          const circleOpacity = interpolate(circleSpring, [0, 1], [0, 1]);
          const circleScale = interpolate(circleSpring, [0, 1], [0.8, 1]);
          return (
            <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r}
              fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={c.strokeWidth}
              opacity={circleOpacity}
              transform={`scale(${circleScale})`}
              transform-origin="50% 50%"
            />
          );
        })}

        {/* Crosshairs */}
        {CROSSHAIRS.map((ch, i) => {
          const chSpring = spring({ frame: Math.max(0, frame - ch.appearFrame), fps: FPS, config: { mass: 0.5, damping: 15, stiffness: 180 } });
          const chOpacity = interpolate(chSpring, [0, 1], [0, 1]);
          const chScale = interpolate(chSpring, [0, 1], [0.3, 1]);
          const chRotate = interpolate(chSpring, [0, 1], [45, 0]);
          const xNum = parseFloat(ch.x);
          const yNum = parseFloat(ch.y);
          const px = (xNum / 100) * 1920;
          const py = (yNum / 100) * 1080;
          const half = ch.size / 2;
          return (
            <g key={`ch${i}`} opacity={chOpacity}
              transform={`translate(${px}, ${py}) scale(${chScale}) rotate(${chRotate})`}
              transform-origin={`${px} ${py}`}>
              <line x1={-half} y1={0} x2={half} y2={0} stroke="rgba(255,255,255,0.7)" strokeWidth={1} />
              <line x1={0} y1={-half} x2={0} y2={half} stroke="rgba(255,255,255,0.7)" strokeWidth={1} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
