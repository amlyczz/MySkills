import React, { useCallback } from "react";
import { useCurrentFrame } from "remotion";

export type DecorationType = "rays" | "crossgrid" | "geometric" | "gpu";

// --- SVG sub-components ---

const Rays: React.FC = () => (
  <div className="absolute inset-0 opacity-100">
    <svg className="w-full h-full">
      <defs>
        <radialGradient id="dco-rays">
          <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <line
            key={i}
            x1="50%"
            y1="50%"
            x2={`${50 + Math.cos(angle) * 80}%`}
            y2={`${50 + Math.sin(angle) * 80}%`}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}
    </svg>
  </div>
);

const CrossGrid: React.FC = () => (
  <div className="absolute inset-0 opacity-100">
    <svg className="w-full h-full">
      {Array.from({ length: 12 }, (_, r) =>
        Array.from({ length: 8 }, (_, c) => (
          <text
            key={`${r}-${c}`}
            x={`${10 + c * 11}%`}
            y={`${8 + r * 8}%`}
            fill="rgba(255,255,255,0.3)"
            fontSize="14"
            fontFamily="monospace"
            textAnchor="middle"
          >
            +
          </text>
        )),
      )}
    </svg>
  </div>
);

const Geometric: React.FC<{ frame: number }> = ({ frame }) => {
  const r1 = (frame * 0.2).toFixed(1);
  const r2 = (-frame * 0.15).toFixed(1);
  const r3 = (frame * 0.3).toFixed(1);

  const c1Ref = useCallback((el: SVGCircleElement | null) => {
    el?.setAttribute("transform", `rotate(${r1} 20% 70%)`);
  }, [r1]);
  const c2Ref = useCallback((el: SVGCircleElement | null) => {
    el?.setAttribute("transform", `rotate(${r2} 80% 30%)`);
  }, [r2]);
  const rectRef = useCallback((el: SVGRectElement | null) => {
    el?.setAttribute("transform", `rotate(${r3} 75% 60%)`);
  }, [r3]);

  return (
    <div className="absolute inset-0 opacity-15">
      <svg className="w-full h-full">
        <circle cx="20%" cy="70%" r="40" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" ref={c1Ref} />
        <circle cx="80%" cy="30%" r="60" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" ref={c2Ref} />
        <line x1="10%" y1="80%" x2="90%" y2="20%" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <line x1="30%" y1="10%" x2="70%" y2="90%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <rect x="75%" y="60%" width="60" height="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" ref={rectRef} />
      </svg>
    </div>
  );
};

const GPU: React.FC<{ frame: number }> = ({ frame }) => {
  const scrollY = ((frame * 2) % 800) - 400;
  return (
    <div className="absolute inset-0 opacity-12">
      <svg className="w-full h-full" viewBox="0 0 1920 1080">
        <g transform={`translate(0, ${scrollY})`}>
          {[0, 1, 2].map((i) => (
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
    </div>
  );
};

// --- Main component ---

interface Props {
  type: DecorationType;
  startFrame?: number;
}

export const DecorationOverlay: React.FC<Props> = ({ type, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);

  switch (type) {
    case "rays":
      return <Rays />;
    case "crossgrid":
      return <CrossGrid />;
    case "geometric":
      return <Geometric frame={elapsed} />;
    case "gpu":
      return <GPU frame={elapsed} />;
    default:
      return null;
  }
};
