import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { PromptInput } from "./components/PromptInput";

const SceneWrapper: React.FC<{ children: React.ReactNode; bgColor?: string }> = ({ children, bgColor = "#F5F5F7" }) => {
  const frame = useCurrentFrame();
  const blur = interpolate(frame, [0, 15], [8, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const scl = interpolate(frame, [0, 15], [1.05, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{
      background: bgColor, display: "flex", alignItems: "center", justifyContent: "center",
      filter: `blur(${blur}px)`, transform: `scale(${scl})`,
    }}>
      {children}
    </AbsoluteFill>
  );
};

const AppCard: React.FC<{ title: string; color: string; children?: React.ReactNode }> = ({ title, color, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  return (
    <div style={{
      width: 380, borderRadius: 28, background: "#FFF", overflow: "hidden",
      boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
      transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`,
      opacity: interpolate(s, [0, 0.5], [0, 1]),
    }}>
      <div style={{
        height: 48, display: "flex", alignItems: "center", padding: "0 16px",
        borderBottom: "1px solid #F0F0F0", gap: 12,
        fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500,
      }}>
        <span>←</span><span style={{ flex: 1 }}>{title}</span><span>Edit</span>
      </div>
      <div style={{
        height: 200, background: color, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 48,
      }}>
        {children}
      </div>
    </div>
  );
};

export const ModernSaasShowcase: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={160}>
      <SceneWrapper>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
          <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "Inter, sans-serif", color: "#1D1D1F", textAlign: "center" }}>
            What do you want to build?
          </div>
          <PromptInput text="Make an art tutor app that teaches me about one great painter daily" startFrame={20} />
        </div>
      </SceneWrapper>
    </Sequence>
    <Sequence from={140} durationInFrames={160}>
      <SceneWrapper bgColor="#F0F2F5">
        <div style={{ display: "flex", gap: 30, alignItems: "center" }}>
          <AppCard title="Art Tutor" color="#FFE8CC">🎨</AppCard>
          <AppCard title="Bedtime Stories" color="#D4E8FF">🌙</AppCard>
        </div>
      </SceneWrapper>
    </Sequence>
  </>
);
