import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { QuadLayout } from "./components/QuadLayout";
import { AnimatedCounter } from "./components/AnimatedCounter";
import { GradientOrbs } from "./components/GradientOrbs";
import { PromptInput } from "./components/PromptInput";

const Scene1: React.FC = () => (
  <QuadLayout>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", background: "#F0FDF4" }}>
      <AnimatedCounter target={6982859} prefix="$" durationFrames={80} />
    </div>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", background: "#FFF" }}>
      <h1 style={{ fontSize: 48, fontFamily: "Inter, sans-serif", fontWeight: 800, color: "#111" }}>Decades of effort</h1>
    </div>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", background: "#FFF" }}>
      <PromptInput text="Chat it into existence" startFrame={10} charsPerFrame={4} />
    </div>
    <div style={{ position: "relative" }}>
      <GradientOrbs />
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        justifyContent: "center", alignItems: "center", zIndex: 1,
        fontSize: 32, fontWeight: 700, fontFamily: "Inter, sans-serif", color: "#333",
      }}>
        Your AI employees
      </div>
    </div>
  </QuadLayout>
);

const Scene2: React.FC = () => (
  <QuadLayout>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", background: "#FEF3C7" }}>
      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 60, fontWeight: 800, color: "#111" }}>30+</div>
        <div style={{ fontSize: 20, color: "#666", marginTop: 8 }}>Years of expertise</div>
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", background: "#DBEAFE" }}>
      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 60, fontWeight: 800, color: "#111" }}>24/7</div>
        <div style={{ fontSize: 20, color: "#666", marginTop: 8 }}>Always available</div>
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", background: "#D1FAE5" }}>
      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 60, fontWeight: 800, color: "#111" }}>100%</div>
        <div style={{ fontSize: 20, color: "#666", marginTop: 8 }}>Accuracy rate</div>
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", background: "#F3E8FF" }}>
      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 60, fontWeight: 800, color: "#111" }}>0</div>
        <div style={{ fontSize: 20, color: "#666", marginTop: 8 }}>Human errors</div>
      </div>
    </div>
  </QuadLayout>
);

export const QuadSplitShowcase: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={140}>
      <Scene1 />
    </Sequence>
    <Sequence from={130} durationInFrames={140}>
      <Scene2 />
    </Sequence>
  </AbsoluteFill>
);
