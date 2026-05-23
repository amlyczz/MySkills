import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { FluidBackground } from "./components/FluidBackground";
import { AnimatedBar } from "./components/AnimatedBar";
import { AnimatedText } from "./components/AnimatedText";
import { GraphicOverlay } from "./components/GraphicOverlay";
import { SplitLayout } from "./components/SplitLayout";
import { UICard } from "./components/UICard";

const FPS = 24;
const H1: React.CSSProperties = { fontFamily: "Inter, sans-serif", fontSize: 64, fontWeight: 600, color: "#000", letterSpacing: "-0.02em", lineHeight: 1.1 };
const H2: React.CSSProperties = { fontFamily: "Inter, sans-serif", fontSize: 32, fontWeight: 400, color: "#333", lineHeight: 1.3 };

const S1_Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, 90], [0.95, 1.03], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <FluidBackground />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }), transform: `scale(${s})`, display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "#000", gridColumn: i === 2 ? "span 2" : undefined, justifySelf: i === 2 ? "center" : undefined }} />)}
          </div>
          <h1 style={{ ...H1, fontSize: 120, fontWeight: 500 }}>Command A+</h1>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const S2_Positioning: React.FC = () => (
  <AbsoluteFill><FluidBackground /><GraphicOverlay type="rays" /><AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}><AnimatedText text="Our fastest and most" preset="fadeUp" delayFrames={10} style={H1} /><AnimatedText text="powerful model to date." preset="fadeUp" delayFrames={20} style={{ ...H1, marginTop: 8 }} highlightWord="powerful" /></AbsoluteFill></AbsoluteFill>
);

const S3_OpenSource: React.FC = () => (
  <AbsoluteFill><FluidBackground intensity={0.8} /><GraphicOverlay type="crossgrid" /><AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}><AnimatedText text="It's open source." preset="scale" delayFrames={10} style={H1} /><AnimatedText text="Weighing in at 111 billion parameters." preset="fadeUp" delayFrames={25} style={{ ...H2, marginTop: 16 }} /></AbsoluteFill></AbsoluteFill>
);

const S4_Architecture: React.FC = () => (
  <AbsoluteFill><FluidBackground intensity={0.7} /><GraphicOverlay type="geometric" /><AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}><AnimatedText text="Built with an efficient" preset="fadeUp" delayFrames={5} style={H1} /><AnimatedText text="mixture-of-experts architecture." preset="fadeUp" delayFrames={18} style={{ ...H1, marginTop: 8 }} /><AnimatedText text="High performance at low inference cost." preset="fadeUp" delayFrames={35} style={{ ...H2, marginTop: 20 }} /></AbsoluteFill></AbsoluteFill>
);

const S5_Benchmarks: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#FAFAFA" }}>
    <div style={{ opacity: 0.06, filter: "blur(50px)", position: "absolute", inset: 0 }}><FluidBackground /></div>
    <SplitLayout
      left={<div><AnimatedText text="Up to 48%" preset="fadeUp" delayFrames={5} style={{ ...H1, fontSize: 80, color: "#FF3B30" }} /><AnimatedText text="sharper than the next best model." preset="fadeUp" delayFrames={15} style={H2} /></div>}
      right={<div style={{ width: "100%" }}>{[{ label: "τ²-Bench Telecom", endValue: 85, maxValue: 100, delay: 20 }, { label: "AIME 2", endValue: 90, maxValue: 100, delay: 30 }].map((b, i) => (<div key={i} style={{ marginBottom: 32 }}><AnimatedBar {...b} /><div style={{ marginLeft: 240, marginTop: -12, display: "flex", gap: 12 }}><span style={{ fontSize: 13, color: "#FF3B30", fontFamily: "Inter, sans-serif" }}>Command A+</span><span style={{ fontSize: 13, color: "#86868B", fontFamily: "Inter, sans-serif" }}>GPT-4o: {37}%</span></div></div>))}</div>}
    />
  </AbsoluteFill>
);

const S6_Speed: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#FAFAFA" }}>
    <div style={{ opacity: 0.06, filter: "blur(50px)", position: "absolute", inset: 0 }}><FluidBackground /></div>
    <SplitLayout
      left={<div><AnimatedText text="Blazing fast" preset="fadeUp" delayFrames={5} style={H1} /><AnimatedText text="output speeds with low latency." preset="fadeUp" delayFrames={15} style={{ ...H2, marginTop: 8 }} /></div>}
      right={<div style={{ width: "100%" }}>{[{ label: "Output Tokens/s", endValue: 156, maxValue: 200, delay: 20 }, { label: "TTFT (seconds)", endValue: 0.18, maxValue: 1, delay: 30 }].map((b, i) => (<div key={i} style={{ marginBottom: 32 }}><AnimatedBar {...b} isHighlight /></div>))}</div>}
    />
  </AbsoluteFill>
);

const S7_Hardware: React.FC = () => (
  <AbsoluteFill><FluidBackground intensity={1.2} /><GraphicOverlay type="gpu" /><AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}><AnimatedText text="Run secure, private AI" preset="fadeUp" delayFrames={5} style={H1} /><AnimatedText text="with as little as two GPUs." preset="fadeUp" delayFrames={20} style={{ ...H1, marginTop: 8 }} /><AnimatedText text="Deploy on-premises or in your VPC." preset="fadeUp" delayFrames={40} style={{ ...H2, marginTop: 20 }} /></AbsoluteFill></AbsoluteFill>
);

const S8_Agents: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [{ title: "Agents", desc: "Multi-step tool use with autonomous reasoning and planning.", icon: "A", delay: 5 }, { title: "Vision", desc: "Analyze images, charts, and documents with high accuracy.", icon: "V", delay: 20 }, { title: "Reasoning", desc: "Chain-of-thought reasoning for complex problem solving.", icon: "R", delay: 35 }];
  return (
    <AbsoluteFill style={{ backgroundColor: "#F8F8FA" }}><div style={{ opacity: 0.06, filter: "blur(50px)", position: "absolute", inset: 0 }}><FluidBackground /></div>
      <SplitLayout left={<div><AnimatedText text="One model." preset="fadeUp" delayFrames={5} style={H1} /><AnimatedText text="Every capability." preset="fadeUp" delayFrames={15} style={{ ...H1, marginTop: 4 }} /></div>}
        right={<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{cards.map((c, i) => { const s = spring({ frame: Math.max(0, frame - c.delay), fps: FPS, config: { mass: 1.2, damping: 12, stiffness: 120 } }); return (<UICard key={i} type="chat" style={{ opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px) scale(${interpolate(s, [0, 1], [0.95, 1])})` }}><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: "#000", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{c.icon}</div><span style={{ fontWeight: 600, fontSize: 18 }}>{c.title}</span></div><p style={{ margin: 0, fontSize: 14, color: "#555", lineHeight: 1.5 }}>{c.desc}</p></UICard>); })}</div>}
      /></AbsoluteFill>
  );
};

const S9_Ecosystem: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [{ label: "23 languages", icon: "🌐" }, { label: "Google Drive", icon: "📁" }, { label: "Slack & Teams", icon: "💬" }, { label: "JSON output", icon: "{ }" }, { label: "Tool calling", icon: "🔧" }, { label: "Streaming", icon: "⚡" }];
  return (
    <AbsoluteFill style={{ backgroundColor: "#F8F8FA", justifyContent: "center", alignItems: "center" }}><div style={{ opacity: 0.05, filter: "blur(50px)", position: "absolute", inset: 0 }}><FluidBackground /></div><AnimatedText text="Built for the ecosystem" preset="fadeUp" delayFrames={5} style={{ ...H1, marginBottom: 32, zIndex: 1 }} /><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, zIndex: 1 }}>{items.map((item, i) => { const s = spring({ frame: Math.max(0, frame - i * 8), fps: FPS, config: { damping: 14, stiffness: 100 } }); return (<UICard key={i} style={{ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`, width: 280 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 24 }}>{item.icon}</span><span style={{ fontSize: 16, fontWeight: 500, color: "#000" }}>{item.label}</span></div></UICard>); })}</div></AbsoluteFill>
  );
};

const S10_Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const s = spring({ frame, fps: FPS, config: { damping: 14, stiffness: 100 } });
  return (
    <AbsoluteFill><FluidBackground intensity={1.3} /><AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}><div style={{ opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.97, 1])})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}><h1 style={{ ...H1, fontSize: 96, color: "#000", fontWeight: 500 }}>Own your AI.</h1><p style={{ ...H2, color: "#555" }}>Command A+ by Cohere</p><div style={{ marginTop: 24, display: "flex", gap: 8 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#000" }} />)}</div></div></AbsoluteFill></AbsoluteFill>
  );
};

export const CohereShowcase: React.FC = () => (
  <>
    <Sequence from={FPS * 0} durationInFrames={FPS * 3}><S1_Intro /></Sequence>
    <Sequence from={FPS * 3} durationInFrames={FPS * 5}><S2_Positioning /></Sequence>
    <Sequence from={FPS * 8} durationInFrames={FPS * 3}><S3_OpenSource /></Sequence>
    <Sequence from={FPS * 11} durationInFrames={FPS * 5}><S4_Architecture /></Sequence>
    <Sequence from={FPS * 16} durationInFrames={FPS * 10}><S5_Benchmarks /></Sequence>
    <Sequence from={FPS * 26} durationInFrames={FPS * 7}><S6_Speed /></Sequence>
    <Sequence from={FPS * 33} durationInFrames={FPS * 6}><S7_Hardware /></Sequence>
    <Sequence from={FPS * 39} durationInFrames={FPS * 13}><S8_Agents /></Sequence>
    <Sequence from={FPS * 52} durationInFrames={FPS * 9}><S9_Ecosystem /></Sequence>
    <Sequence from={FPS * 61} durationInFrames={FPS * 6}><S10_Outro /></Sequence>
  </>
);
