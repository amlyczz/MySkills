import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserMockup } from "./components/BrowserMockup";
import { SearchBar } from "./components/SearchBar";
import { VideoCard } from "./components/VideoCard";
import { AISummaryBox } from "./components/AISummaryBox";
import { Cursor } from "./components/Cursor";

const CURSOR_PATH: [number, number, number][] = [
  [0, 620, 200],
  [35, 750, 200],
  [50, 760, 215],
  [65, 740, 195],
  [80, 620, 380],
  [110, 400, 380],
  [130, 400, 390],
  [145, 400, 375],
  [160, 550, 500],
  [190, 600, 510],
  [210, 610, 525],
  [225, 600, 510],
];

const videos = [
  { title: "Best kids bikes 2026 – balance vs pedal", channel: "FamilyVlog", views: "1.2M", time: "2 weeks ago", thumbnailColor: "#DBEAFE" },
  { title: "Teaching my 3 year old to ride in ONE day", channel: "DadLife", views: "850K", time: "1 month ago", thumbnailColor: "#FEF3C7" },
  { title: "Top 5 toddler bike safety tips every parent should know", channel: "SafeKids", views: "430K", time: "3 weeks ago", thumbnailColor: "#D1FAE5" },
];

const summaryCards = [
  { label: "Best Balance Bikes", desc: "Lightweight frames, adjustable seats for ages 2–5", color: "#FEF3C7" },
  { label: "Safety Gear Guide", desc: "Helmets, knee pads, and visibility flags", color: "#DBEAFE" },
];

// ── Scene 1: Logo + search typing ──
const SearchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame: Math.max(0, frame - 5), fps, config: { mass: 1, damping: 14, stiffness: 120 } });
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);
  const logoScale = interpolate(logoSpring, [0, 1], [0.9, 1]);

  return (
    <AbsoluteFill style={{ background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <BrowserMockup>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100%" }}>
          <div style={{
            opacity: logoOpacity, transform: `scale(${logoScale})`,
            marginBottom: 32, textAlign: "center",
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#0F0F0F", fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em" }}>
              YouTube
            </div>
          </div>
          <SearchBar query="how to teach my 3 year old to ride a bike" typingSpeed={3} />
        </div>
      </BrowserMockup>
      <Cursor path={CURSOR_PATH.slice(0, 4)} />
    </AbsoluteFill>
  );
};

// ── Scene 2: Search results + AI summary ──
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dropdownVisible = frame < 50;
  const scrollOffset = interpolate(frame, [40, 80], [0, -400], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const summarySpring = spring({ frame: Math.max(0, frame - 60), fps, config: { mass: 1, damping: 16, stiffness: 110 } });
  const summaryOpacity = interpolate(summarySpring, [0, 1], [0, 1]);
  const summaryY = interpolate(summarySpring, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <BrowserMockup>
        <div style={{ transform: `translateY(${scrollOffset}px)`, willChange: "transform" }}>
          <SearchBar query="how to teach my 3 year old to ride a bike" showDropdown={dropdownVisible} typingSpeed={100} />

          <div style={{ opacity: summaryOpacity, transform: `translateY(${summaryY}px)` }}>
            <AISummaryBox
              title="Graduating from balance bikes"
              text="Moving from a **balance bike** to a pedal bike is easier when kids already have steering and coordination skills. Start with **training wheels removed** on flat ground, and let them practice gliding before pedaling."
              cards={summaryCards}
            />
          </div>

          <div style={{
            opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [80, 100], [20, 0], { extrapolateRight: "clamp" })}px)`,
          }}>
            {videos.map((v, i) => (
              <VideoCard key={i} {...v} />
            ))}
          </div>
        </div>
      </BrowserMockup>
      <Cursor path={CURSOR_PATH.slice(4)} />
    </AbsoluteFill>
  );
};

export const ProductDemoShowcase: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={140}>
      <SearchScene />
    </Sequence>
    <Sequence from={125} durationInFrames={180}>
      <ResultsScene />
    </Sequence>
  </>
);
