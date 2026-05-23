import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { AuroraBg } from "./components/AuroraBg";
import { FloatingCard } from "./components/FloatingCard";
import { useTypewriter } from "./hooks/useTypewriter";

const TitleText: React.FC<{ text: string; highlight?: string[]; delay: number }> = ({ text, highlight = [], delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const scl = interpolate(frame - delay, [0, 15], [0.9, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  return (
    <div style={{
      opacity, transform: `scale(${scl})`,
      fontSize: 64, fontWeight: 800, color: "#FFF",
      fontFamily: "Inter, sans-serif", textAlign: "center",
      display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center",
    }}>
      {text.split(" ").map((w, i) => (
        <span key={i} style={{ color: highlight.includes(w) ? "#4285F4" : "#FFF" }}>{w}</span>
      ))}
    </div>
  );
};

const Scene1: React.FC = () => {
  const { displayText: typed, isTyping } = useTypewriter("Build anything with real data.", 30, 2);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 40 }}>
      <TitleText text="Build anything" highlight={["anything"]} delay={0} />
      <div style={{
        fontSize: 32, color: "#AAA", fontFamily: "Inter, sans-serif",
        fontWeight: 400, minHeight: 48,
      }}>
        {typed}
        {isTyping && <span style={{ opacity: Math.sin(useCurrentFrame() * 0.3) > 0 ? 1 : 0 }}>|</span>}
      </div>
      <FloatingCard delay={40} rotX={10} rotY={-10} glow style={{ width: 500, height: 320, background: "#1A1A1A" }}>
        <div style={{ padding: 30, color: "#FFF", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>App Preview</div>
          <div style={{ background: "#2A2A2A", borderRadius: 12, height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🏗️</div>
        </div>
      </FloatingCard>
    </AbsoluteFill>
  );
};

const Scene2: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 40 }}>
    <TitleText text="Break the ceiling" highlight={["ceiling"]} delay={0} />
    <div style={{ display: "flex", gap: 30 }}>
      <FloatingCard delay={10} rotX={-5} rotY={15} scale={0.85} zIdx={2} glow style={{ width: 380, height: 260, background: "#1A1A1A" }}>
        <div style={{ padding: 24, color: "#FFF", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontSize: 14, color: "#AAA" }}>Before</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>Manual workflow</div>
          <div style={{ fontSize: 14, color: "#AAA", marginTop: 8 }}>Hours of repetitive tasks</div>
        </div>
      </FloatingCard>
      <FloatingCard delay={25} rotX={5} rotY={-10} scale={0.9} zIdx={1} style={{ width: 380, height: 260, background: "#1A1A1A" }}>
        <div style={{ padding: 24, color: "#FFF", fontFamily: "Inter, sans-serif" }}>
          <div style={{ fontSize: 14, color: "#4285F4" }}>After</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>AI powered</div>
          <div style={{ fontSize: 14, color: "#AAA", marginTop: 8 }}>Instant results</div>
        </div>
      </FloatingCard>
    </div>
  </AbsoluteFill>
);

export const TechLaunchShowcase: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <AuroraBg />
    <Sequence from={0} durationInFrames={130}>
      <Scene1 />
    </Sequence>
    <Sequence from={110} durationInFrames={130}>
      <Scene2 />
    </Sequence>
    <div style={{
      position: "absolute", bottom: 30, left: 30,
      width: 140, height: 80, borderRadius: 12,
      border: "2px solid rgba(255,255,255,0.3)", overflow: "hidden", zIndex: 999,
      background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center",
      color: "#FFF", fontSize: 12, fontFamily: "Inter, sans-serif",
    }}>
      Speaker
    </div>
  </AbsoluteFill>
);
