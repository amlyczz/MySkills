import React from "react";
import { useCurrentFrame } from "remotion";

export const FluidBackground: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const t = frame / 60;

  const orbs = [
    { x: Math.sin(t) * 20 + 40, y: Math.cos(t * 0.7) * 20 + 30, color: "rgba(0,122,255,0.7)", size: "120%" },
    { x: Math.cos(t * 0.8) * 20 + 60, y: Math.sin(t * 1.1) * 20 + 70, color: `rgba(255,204,0,${0.65 * intensity})`, size: "100%" },
    { x: Math.sin(t * 0.9) * 20 + 50, y: Math.cos(t * 1.3) * 30 + 50, color: `rgba(255,59,48,${0.6 * intensity})`, size: "140%" },
    { x: Math.cos(t * 1.1) * 20 + 70, y: Math.sin(t * 0.6) * 20 + 50, color: `rgba(50,173,230,${0.45 * intensity})`, size: "110%" },
  ];

  return (
    <div className="absolute inset-0 bg-[#040510] overflow-hidden blur-[70px]">
      {orbs.map((o, i) => (
        <div key={i} className="absolute" style={{
          width: o.size, height: o.size,
          background: `radial-gradient(circle, ${o.color} 0%, rgba(0,0,0,0) 60%)`,
          left: `${o.x - 30}%`, top: `${o.y - 30}%`,
        }} />
      ))}
    </div>
  );
};
