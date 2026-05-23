import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { FluidBackground } from "./components/FluidBackground";
import { AnimatedBar } from "./components/AnimatedBar";
import { AgentCard } from "./components/AgentCard";

const FPS = 24;

// ═══ Scene 1: Logo intro (0-4s) ═══
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 120], [0.95, 1.05], { extrapolateRight: "clamp" });
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });

  return (
    <AbsoluteFill>
      <FluidBackground />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity, transform: `scale(${scale})`, display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "#000", gridColumn: i === 2 ? "span 2" : undefined, justifySelf: i === 2 ? "center" : undefined }} />
            ))}
          </div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: 120, fontWeight: 500, color: "#000", margin: 0, letterSpacing: "-0.04em" }}>
            Command A+
          </h1>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ═══ Scene 2: Benchmark bars (4-10s) ═══
const BenchmarksScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const bars = [
    { label: "GPT-4o", endValue: 82, maxValue: 100, delay: 10 },
    { label: "Claude 3.5", endValue: 85, maxValue: 100, delay: 15 },
    { label: "Command A+", endValue: 94, maxValue: 100, isHighlight: true, delay: 5 },
    { label: "Gemini 1.5", endValue: 79, maxValue: 100, delay: 20 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#FAFAFA" }}>
      <AbsoluteFill style={{ opacity: 0.08, filter: "blur(60px)" }}>
        <FluidBackground />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 42, fontWeight: 600, color: "#000", textAlign: "center", margin: 0 }}>
            Performance Benchmarks
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: "#666", textAlign: "center", margin: "12px 0 0" }}>
            Reasoning & Knowledge Accuracy (%)
          </p>
        </div>
        {bars.map((b, i) => <AnimatedBar key={i} {...b} />)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ═══ Scene 3: Agent cards (10-16s) ═══
const CardsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const cards = [
    { icon: "R", title: "Research Agent", description: "Conducts deep web research, synthesizes findings, and generates comprehensive reports with citations.", author: "Cohere", delay: 0 },
    { icon: "C", title: "Code Agent", description: "Writes, reviews, and debugs code across multiple languages with full context awareness.", author: "Cohere", delay: 10 },
    { icon: "D", title: "Data Agent", description: "Analyzes structured and unstructured data, creates visualizations, and surfaces insights automatically.", author: "Cohere", delay: 20 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#F5F5F7", justifyContent: "center", alignItems: "center", gap: 24 }}>
      <FluidBackground />
      <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 38, fontWeight: 600, color: "#000", zIndex: 1, marginBottom: 8 }}>
        Meet your AI agents
      </h2>
      <div style={{ display: "flex", gap: 24, zIndex: 1 }}>
        {cards.map((c, i) => {
          const s = spring({ frame: Math.max(0, frame - c.delay), fps: FPS, config: { damping: 14, stiffness: 100 } });
          return (
            <div key={i} style={{ opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)` }}>
              <AgentCard {...c} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const CohereShowcase: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={FPS * 4}><IntroScene /></Sequence>
    <Sequence from={FPS * 4} durationInFrames={FPS * 6}><BenchmarksScene /></Sequence>
    <Sequence from={FPS * 10} durationInFrames={FPS * 6}><CardsScene /></Sequence>
  </>
);
