import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

type OverlayType = "rays" | "crossgrid" | "geometric" | "gpu";

const CrossGrid: React.FC<{ opacity: number; scale: number }> = ({ opacity, scale }) => (
  <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
    <svg width="100%" height="100%">
      {Array.from({ length: 12 }, (_, r) =>
        Array.from({ length: 8 }, (_, c) => (
          <text key={`${r}-${c}`} x={`${10 + c * 11}%`} y={`${8 + r * 8}%`} fill="rgba(255,255,255,0.3)" fontSize="14" fontFamily="monospace" textAnchor="middle">+</text>
        ))
      )}
    </svg>
  </AbsoluteFill>
);

const RaysOverlay: React.FC<{ opacity: number }> = ({ opacity }) => (
  <AbsoluteFill style={{ opacity }}>
    <svg width="100%" height="100%">
      <defs>
        <radialGradient id="rays"><stop offset="0%" stopColor="rgba(255,255,255,0.1)" /><stop offset="100%" stopColor="transparent" /></radialGradient>
      </defs>
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1="50%" y1="50%" x2={`${50 + Math.cos((i / 8) * Math.PI * 2) * 80}%`} y2={`${50 + Math.sin((i / 8) * Math.PI * 2) * 80}%`} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
    </svg>
  </AbsoluteFill>
);

const GeometricOverlay: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ opacity: 0.15 }}>
    <svg width="100%" height="100%">
      <circle cx="20%" cy="70%" r="40" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" transform={`rotate(${frame * 0.2} 20% 70%)`} />
      <circle cx="80%" cy="30%" r="60" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" transform={`rotate(${-frame * 0.15} 80% 30%)`} />
      <line x1="10%" y1="80%" x2="90%" y2="20%" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      <line x1="30%" y1="10%" x2="70%" y2="90%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <rect x="75%" y="60%" width="60" height="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" transform={`rotate(${frame * 0.3} 75% 60%)`} />
    </svg>
  </AbsoluteFill>
);

const GPUOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const scrollY = (frame * 2) % 800 - 400;
  return (
    <AbsoluteFill style={{ opacity: 0.12 }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080">
        <g transform={`translate(0, ${scrollY})`}>
          {[0, 1, 2].map(i => (
            <g key={i} transform={`translate(${300 + i * 500}, ${i * 300})`}>
              <rect x="0" y="0" width="280" height="40" rx="4" fill="none" stroke="rgba(50,173,230,0.5)" strokeWidth="1" />
              <rect x="0" y="60" width="280" height="20" rx="2" fill="rgba(50,173,230,0.1)" stroke="rgba(50,173,230,0.3)" strokeWidth="0.5" />
              <rect x="0" y="100" width="280" height="80" rx="4" fill="none" stroke="rgba(50,173,230,0.4)" strokeWidth="1" />
              <circle cx="100" cy="140" r="20" fill="none" stroke="rgba(50,173,230,0.5)" strokeWidth="1" />
              {Array.from({ length: 8 }, (_, j) => (
                <line key={j} x1="160" y1={110 + j * 8} x2="280" y2={110 + j * 8} stroke="rgba(50,173,230,0.3)" strokeWidth="0.5" />
              ))}
            </g>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

interface Props { type: OverlayType; startFrame?: number; }

export const GraphicOverlay: React.FC<Props> = ({ type, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const opacity = interpolate(elapsed, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(elapsed, [0, 120], [1.05, 0.98], { extrapolateRight: "clamp" });

  switch (type) {
    case "rays": return <RaysOverlay opacity={opacity} />;
    case "crossgrid": return <CrossGrid opacity={opacity} scale={scale} />;
    case "geometric": return <GeometricOverlay frame={elapsed} />;
    case "gpu": return <GPUOverlay frame={elapsed} />;
    default: return null;
  }
};
