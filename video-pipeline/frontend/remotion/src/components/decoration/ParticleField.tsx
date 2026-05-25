import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Particle {
  x: number;
  y: number;
  size: number;
}

interface Props {
  particles?: Particle[];
  count?: number;
  color?: string;
  /** Shape: "diamond" | "circle" | "cross" | "square" */
  shape?: string;
  delay?: number;
  drift?: number;
  opacity?: number;
  seed?: number;
}

function generateParticles(count: number, seed: number): Particle[] {
  const ps: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const h = (seed * 374761393 + i * 668265263 + 1274126177) & 0x7fffffff;
    ps.push({
      x: (h % 1920),
      y: ((h >> 10) % 1080),
      size: 3 + (h % 6),
    });
  }
  return ps;
}

const clipPaths: Record<string, string> = {
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  circle: "circle(50% at 50% 50%)",
  cross: "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)",
  square: "none",
};

export const ParticleField: React.FC<Props> = ({
  particles: customParticles,
  count = 8,
  color = "#FFFFFF",
  shape = "diamond",
  delay = 0,
  drift = 15,
  opacity: maxOpacity = 0.4,
  seed = 42,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delay);
  const opacity = interpolate(elapsed, [0, 20], [0, maxOpacity], { extrapolateRight: "clamp" });

  const ps = customParticles ?? generateParticles(count, seed);
  const clipPath = clipPaths[shape] ?? clipPaths.diamond;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {ps.map((p, i) => {
        const t = elapsed * 0.5 + i * 20;
        const dx = Math.sin(t * 0.05) * drift;
        const dy = Math.cos(t * 0.07) * drift;
        return (
          <div key={i} style={{
            position: "absolute", left: p.x + dx, top: p.y + dy,
            width: p.size, height: p.size,
            background: color, opacity,
            clipPath: clipPath === "none" ? undefined : clipPath,
          }} />
        );
      })}
    </div>
  );
};
