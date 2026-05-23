import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BackgroundProps } from "./Starfield";

const PARTICLE_COUNT = 150;

export const Nebula3D: React.FC<BackgroundProps & { speed?: number }> = ({
  primaryColor = "#3b82f6",
  accentColor = "#8b5cf6",
  bgColor = "#0f172a",
  speed = 1.0,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Generate particles deterministically based on colors
  const particles = useMemo(() => {
    const pts = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Deterministic pseudo-random
      const rand1 = Math.sin(i * 12.9898) * 43758.5453;
      const rand2 = Math.cos(i * 78.233) * 43758.5453;
      const x = (rand1 - Math.floor(rand1)) * width;
      const y = (rand2 - Math.floor(rand2)) * height;
      const size = ((rand1 * 100) % 2) + 1;
      const isAccent = (rand2 * 100) % 10 > 7;
      pts.push({ x, y, size, color: isAccent ? accentColor : "#ffffff" });
    }
    return pts;
  }, [width, height, accentColor]);

  // Very slow and gentle floating background drift
  const bgDriftX = Math.sin(frame * 0.005 * speed) * 50;
  const bgDriftY = Math.cos(frame * 0.003 * speed) * 30;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: "hidden" }}>
      {/* Soft Gradient Orbs */}
      <div
        style={{
          position: "absolute",
          top: -200 + bgDriftY,
          left: -200 + bgDriftX,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${primaryColor}40 0%, transparent 60%)`,
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -300 - bgDriftY,
          right: -100 - bgDriftX,
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}30 0%, transparent 60%)`,
          filter: "blur(80px)",
        }}
      />

      {/* Stars Layer */}
      <div style={{ position: "absolute", width: "100%", height: "100%" }}>
        {particles.map((p, i) => {
          // Slow parallax floating
          const parallaxX = Math.sin(frame * 0.001 * speed + i) * 20;
          const parallaxY = Math.cos(frame * 0.001 * speed + i) * 20;
          
          // Twinkle effect
          const twinkle = Math.sin(frame * 0.05 + i) * 0.5 + 0.5;
          const opacity = 0.3 + twinkle * 0.7;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x + parallaxX,
                top: p.y + parallaxY,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: "50%",
                opacity,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
