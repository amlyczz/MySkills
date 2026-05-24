import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { ProgressRing } from "./components/content/ProgressRing";

const PhoneFrame: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ width: 300, height: 600, borderRadius: 40, background: "#FFF", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden", position: "relative", flexShrink: 0, ...style }}>
    <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 80, height: 28, borderRadius: 20, background: "#1A1A1A", zIndex: 10 }} />
    <div style={{ height: 54 }} />
    {children}
    <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", width: 120, height: 5, borderRadius: 3, background: "#999" }} />
  </div>
);

const Counter: React.FC<{ target: number; unit?: string; delay?: number }> = ({ target, unit = "", delay = 0 }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame - delay, [0, 40], [0, target], { extrapolateRight: "clamp" });
  return <span style={{ fontSize: 48, fontWeight: 700, fontFamily: "Inter, sans-serif", color: "#0F172A" }}>{Math.round(v)}{unit}</span>;
};

const TabBar: React.FC<{ items: string[]; active: number }> = ({ items, active }) => (
  <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 16px", borderTop: "1px solid #F0F0F0", background: "#FFF" }}>
    {items.map((t, i) => <div key={i} style={{ fontSize: 10, fontWeight: i === active ? 600 : 400, color: i === active ? "#2563EB" : "#94A3B8", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, background: i === active ? "#2563EB" : "#E2E8F0" }} />{t}</div>)}</div>
);

const HomePhone: React.FC = () => (
  <PhoneFrame>
    <div style={{ padding: 16, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 12, color: "#64748B" }}>Today</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>Activity</div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}><ProgressRing progress={75} size={140} /></div>
      <div style={{ textAlign: "center", marginTop: 12 }}><Counter target={6843} unit=" steps" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
        {[{ label: "Calories", val: "2,143", color: "#FEF3C7" }, { label: "Heart Rate", val: "72 bpm", color: "#DBEAFE" }, { label: "Sleep", val: "7.5 hrs", color: "#D1FAE5" }, { label: "Water", val: "6 cups", color: "#E0E7FF" }].map((m, i) => (
          <div key={i} style={{ background: m.color, borderRadius: 16, padding: 14 }}><div style={{ fontSize: 12, color: "#64748B" }}>{m.label}</div><div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>{m.val}</div></div>
        ))}
      </div>
    </div>
    <TabBar items={["Home", "Trends", "Coach", "Profile"]} active={0} />
  </PhoneFrame>
);

const StreakPhone: React.FC = () => (
  <PhoneFrame>
    <div style={{ padding: 16, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 12, color: "#64748B" }}>Your Streak</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 40 }}>🔥</span>
        <span style={{ fontSize: 36, fontWeight: 700, color: "#0F172A" }}>15</span>
        <span style={{ fontSize: 16, color: "#64748B" }}>days</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 20 }}>
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: i < 15 ? "#F59E0B" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: i < 15 ? "#FFF" : "#94A3B8", fontWeight: i === 14 ? 700 : 400, border: i === 14 ? "2px solid #2563EB" : "none" }}>
            {i + 1}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}><div style={{ background: "#0F172A", color: "#FFF", borderRadius: 999, padding: "12px 32px", fontSize: 14, fontWeight: 600 }}>Continue Streak</div></div>
    </div>
    <TabBar items={["Home", "Streaks", "Social", "Profile"]} active={1} />
  </PhoneFrame>
);

export const HealthAppShowcase: React.FC = () => (
  <AbsoluteFill style={{ background: "#F8FAFC", justifyContent: "center", alignItems: "center", gap: 40, flexDirection: "row" }}>
    <Sequence from={0} durationInFrames={180}><HomePhone /></Sequence>
    <Sequence from={20} durationInFrames={160}><StreakPhone /></Sequence>
  </AbsoluteFill>
);
