import React, { useMemo } from "react";
import { useCurrentFrame, interpolate } from "remotion";

function pseudoRandom(seed: number) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }

export const StarParticles: React.FC<{ count?: number }> = ({ count = 30 }) => {
  const frame = useCurrentFrame();
  const stars = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i, x: pseudoRandom(i) * 100, y: pseudoRandom(i + 1000) * 100,
    rotation: pseudoRandom(i + 2000) * 360, scale: 0.4 + pseudoRandom(i + 3000) * 0.8,
    delay: pseudoRandom(i + 4000) * 60,
  })), [count]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map(s => {
        const p = interpolate(frame - s.delay, [0, 120], [0, 1], { extrapolateRight: "clamp" });
        return (
          <div key={s.id} style={{
            position: "absolute", left: `${s.x}%`,
            top: `${interpolate(p, [0, 1], [-10, 110])}%`,
            transform: `rotate(${s.rotation + p * 360}deg) scale(${s.scale})`,
            opacity: interpolate(p, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
            width: 16, height: 16,
          }}>
            <svg viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          </div>
        );
      })}
    </div>
  );
};
