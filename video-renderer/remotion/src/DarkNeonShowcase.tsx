import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";
import { colors, glow } from "./theme/tokens";
import { GlowPanel } from "./components/GlowPanel";
import { UploadZone } from "./components/UploadZone";
import { FileCard } from "./components/FileCard";
import { ChatInput } from "./components/ChatInput";
import { ChatBubble } from "./components/ChatBubble";
import { OrbitalProcessor } from "./components/OrbitalProcessor";
import { GlowSpinner } from "./components/GlowSpinner";
import { useTypewriter } from "./hooks/useTypewriter";

const FONT = { fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" } as const;
const FPS = 24;

// ── Phase 1: Upload panel ──
const UploadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const s = spring({ frame: Math.max(0, frame - 5), fps: FPS, config: { mass: 1, damping: 16, stiffness: 140 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [60, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity, transform: `translateY(${y}px)` }}>
        <GlowPanel glowIntensity={1.2} style={{ width: 480, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ ...FONT, fontSize: 20, fontWeight: 500, color: colors.text, textAlign: "center" }}>
            Document Processing
          </div>
          <UploadZone />
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <FileCard icon="📄" name="report.pdf" />
            <FileCard icon="📊" name="data.csv" />
            <FileCard icon="🖼️" name="scan.png" />
          </div>
        </GlowPanel>
      </div>
    </AbsoluteFill>
  );
};

// ── Phase 2: Chat flow ──
const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const b1 = spring({ frame: Math.max(0, frame - 0), fps, config: { mass: 1, damping: 18, stiffness: 150 } });
  const b2 = spring({ frame: Math.max(0, frame - 10), fps, config: { mass: 1, damping: 18, stiffness: 150 } });
  const b3 = spring({ frame: Math.max(0, frame - 20), fps, config: { mass: 1, damping: 18, stiffness: 150 } });

  const bubble = (s: number) => ({
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [12, 0])}px) scale(${interpolate(s, [0, 1], [0.95, 1])})`,
  });

  const { displayText: typedText, isTyping } = useTypewriter(
    "Sure — I've extracted the key dates and attached the summary.",
    40, 3
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <GlowPanel style={{ width: 520, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...FONT, fontSize: 14, color: colors.textDim, textAlign: "center", marginBottom: 8 }}>
          Chat Session
        </div>
        <div style={bubble(b1)}>
          <ChatBubble type="user">Extract all dates from these documents</ChatBubble>
        </div>
        <div style={bubble(b2)}>
          <ChatBubble type="agent">
            <GlowSpinner size={16} strokeWidth={2} />
            <span style={{ marginLeft: 8 }}>Analyzing files...</span>
          </ChatBubble>
        </div>
        <div style={bubble(b3)}>
          <ChatBubble type="agent">
            {typedText}
            {isTyping && <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0, fontWeight: 300 }}>|</span>}
          </ChatBubble>
        </div>
        <ChatInput value="Extract all dates from these documents" style={{ marginTop: 8 }} />
      </GlowPanel>
    </AbsoluteFill>
  );
};

// ── Phase 3: Orbital processing ──
const ProcessingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const s = spring({ frame: Math.max(0, frame - 5), fps: FPS, config: { mass: 1, damping: 16, stiffness: 130 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity: interpolate(s, [0, 1], [0, 1]), transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})` }}>
        <GlowPanel style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ ...FONT, fontSize: 16, fontWeight: 500, color: colors.text }}>
            Processing Pipeline
          </div>
          <OrbitalProcessor
            files={[
              { icon: "📄", name: "contract.pdf" },
              { icon: "📧", name: "email.txt" },
              { icon: "📊", name: "report.xlsx" },
              { icon: "🖼️", name: "scan.png" },
            ]}
            radius={130}
            centerIcon="🤖"
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GlowSpinner size={16} />
            <span style={{ ...FONT, fontSize: 13, color: colors.textDim }}>Extracting dates...</span>
          </div>
        </GlowPanel>
      </div>
    </AbsoluteFill>
  );
};

// ── Phase 4: Dashboard result ──
const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const s = spring({ frame: Math.max(0, frame - 5), fps: FPS, config: { mass: 1, damping: 14, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)` }}>
        <GlowPanel glowIntensity={1.3} style={{ width: 560, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...FONT, fontSize: 18, fontWeight: 500, color: colors.text, textAlign: "center" }}>
            Extracted Dates
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Contract Signed", date: "2026-03-15" },
              { label: "Delivery Due", date: "2026-04-01" },
              { label: "Review Meeting", date: "2026-04-10" },
              { label: "Renewal Date", date: "2026-06-30" },
            ].map((item, i) => {
              const cardSpring = spring({ frame: Math.max(0, frame - 10 - i * 8), fps: FPS, config: { mass: 0.5, damping: 15, stiffness: 170 } });
              return (
                <div key={i} style={{
                  background: colors.cardBg, borderRadius: 12,
                  border: `1px solid ${colors.cardBorder}`,
                  padding: "14px 16px",
                  opacity: interpolate(cardSpring, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardSpring, [0, 1], [10, 0])}px)`,
                }}>
                  <div style={{ fontSize: 11, color: colors.textMuted, ...FONT }}>{item.label}</div>
                  <div style={{ fontSize: 16, color: colors.neon, fontWeight: 500, marginTop: 4, ...FONT, filter: `drop-shadow(${glow.text(0.5)})` }}>{item.date}</div>
                </div>
              );
            })}
          </div>
        </GlowPanel>
      </div>
    </AbsoluteFill>
  );
};

// ── Root showcase ──
export const DarkNeonShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      {/* Subtle background grid */}
      <AbsoluteFill style={{
        backgroundImage: `
          linear-gradient(rgba(0,245,212,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,212,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        pointerEvents: "none",
      }} />

      {/* Ambient glow top-center */}
      <div style={{
        position: "absolute", top: "-20%", left: "50%",
        transform: "translateX(-50%)",
        width: 800, height: 500,
        background: "radial-gradient(circle, rgba(0,245,212,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <Sequence from={0} durationInFrames={110}>
        <UploadScene />
      </Sequence>

      <Sequence from={100} durationInFrames={160}>
        <ChatScene />
      </Sequence>

      <Sequence from={240} durationInFrames={140}>
        <ProcessingScene />
      </Sequence>

      <Sequence from={360} durationInFrames={140}>
        <DashboardScene />
      </Sequence>
    </AbsoluteFill>
  );
};
