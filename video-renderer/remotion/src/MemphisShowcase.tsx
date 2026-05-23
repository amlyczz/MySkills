import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { MemphisCard } from "./components/MemphisCard";
import { DotGridBg } from "./components/DotGridBg";

const TypingInput: React.FC<{ text: string; startFrame: number }> = ({ text, startFrame }) => {
  const frame = useCurrentFrame();
  const chars = Math.min(text.length, Math.floor(Math.max(0, frame - startFrame) / 2));
  const done = chars >= text.length;
  return (
    <div style={{ background: "#FFF", borderRadius: 24, padding: "16px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", width: "80%", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <span style={{ fontSize: 18, color: "#111", flex: 1 }}>{text.slice(0, chars)}{chars < text.length && <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0 }}>|</span>}</span>
      {done && <div style={{ width: 32, height: 32, background: "#000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: 16 }}>↑</div>}
    </div>
  );
};

const GeneratingPill: React.FC = () => (
  <div style={{ background: "#000", color: "#FFF", borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif", position: "absolute", top: -15, left: 20 }}>
    <div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Generating...
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Scene1_Input: React.FC = () => (
  <AbsoluteFill><DotGridBg />
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 30 }}>
      <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "Inter, sans-serif", color: "#111", textAlign: "center" }}>What do you want to design?</div>
      <TypingInput text="Make an art tutor app that teaches me about one great painter daily" startFrame={15} />
    </AbsoluteFill>
  </AbsoluteFill>
);

const Scene2_Cards: React.FC = () => (
  <AbsoluteFill style={{ background: "#0A192F", justifyContent: "center", alignItems: "center", gap: 20 }}>
    <MemphisCard name="Sarah Chen" role="Design Lead" text="The AI generated my entire brand kit in seconds. The Memphis style options were spot on." theme="blue" delay={0} />
    <MemphisCard name="James Park" role="Product Manager" text="From a text prompt to 10 unique card designs. This changed how we approach visual content." theme="red" delay={10} />
  </AbsoluteFill>
);

export const MemphisShowcase: React.FC = () => (<><Sequence from={0} durationInFrames={140}><Scene1_Input /></Sequence><Sequence from={120} durationInFrames={150}><Scene2_Cards /></Sequence></>);
