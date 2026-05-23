import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const TextBlock: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp" });
  return (
    <div style={{ position: "absolute", left: 80, top: 250, fontFamily: "Inter, sans-serif", opacity: o }}>
      {text.split(" ").map((w, i) => (
        <span key={i} style={{ marginRight: 8, fontSize: 48, fontWeight: 700, color: w.toLowerCase() === highlight.toLowerCase() ? "#E6502A" : "#111" }}>{w}</span>
      ))}
    </div>
  );
};

const Head: React.FC<{ open?: boolean }> = ({ open }) => {
  const frame = useCurrentFrame();
  const p = spring({ frame, fps: 24, config: { damping: 15, stiffness: 80 } });
  const lift = open ? interpolate(p, [0, 1], [0, -50]) : 0;
  return (
    <svg viewBox="0 0 200 250" style={{ width: 200, height: 250 }}>
      <ellipse cx="100" cy="150" rx="70" ry="90" fill="#111" />
      <circle cx="80" cy="130" r="4" fill="#FFF" />
      <g transform={`translate(0, ${lift})`}>
        <ellipse cx="100" cy="60" rx="60" ry="40" fill="#111" />
      </g>
    </svg>
  );
};

const Sun: React.FC = () => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 40], [50, -30], { extrapolateRight: "clamp" });
  const s = interpolate(frame, [0, 20], [0.3, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 80, left: "50%", transform: `translate(-50%, ${y}px) scale(${s})` }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="30" fill="#E6502A" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
          const rad = (a * Math.PI) / 180;
          return <line key={a} x1={40 + Math.cos(rad) * 35} y1={40 + Math.sin(rad) * 35} x2={40 + Math.cos(rad) * 50} y2={40 + Math.sin(rad) * 50} stroke="#E6502A" strokeWidth={3} />;
        })}
      </svg>
    </div>
  );
};

const Plant: React.FC = () => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, 40], [0.1, 1], { extrapolateRight: "clamp", easing: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t });
  return (
    <div style={{ position: "absolute", top: 60, left: "50%", transform: `translateX(-50%) scale(${s})` }}>
      <svg width="60" height="120" viewBox="0 0 60 120">
        <line x1="30" y1="120" x2="30" y2="60" stroke="#111" strokeWidth={4} />
        <ellipse cx="30" cy="50" rx="25" ry="30" fill="#E6502A" />
        <circle cx="20" cy="40" r="8" fill="#111" />
        <circle cx="40" cy="35" r="6" fill="#111" />
      </svg>
    </div>
  );
};

const Scene1_Sun: React.FC = () => (
  <AbsoluteFill style={{ background: "#EAE6DE" }}>
    <TextBlock text="The mind thrives in clarity." highlight="clarity" />
    <div style={{ position: "absolute", right: 150, top: 200 }}><Head open /><Sun /></div>
  </AbsoluteFill>
);

const Scene2_Plant: React.FC = () => (
  <AbsoluteFill style={{ background: "#EAE6DE" }}>
    <TextBlock text="Ideas grow when nurtured." highlight="grow" />
    <div style={{ position: "absolute", right: 150, top: 200 }}><Head open /><Plant /></div>
  </AbsoluteFill>
);

export const MetaphorShowcase: React.FC = () => (<><Sequence from={0} durationInFrames={130}><Scene1_Sun /></Sequence><Sequence from={110} durationInFrames={130}><Scene2_Plant /></Sequence></>);
