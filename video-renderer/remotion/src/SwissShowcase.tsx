import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";
import { NoiseBackground } from "./components/NoiseBackground";
import { RealisticSphere } from "./components/RealisticSphere";
import { MinimalCard } from "./components/MinimalCard";
import { Typewriter } from "./components/Typewriter";
import { ConnectionLine } from "./components/ConnectionLine";

const FONT = { fontFamily: "Inter, sans-serif" } as const;

// ── Phase 1: Sphere entrance with breathing ──
const SphereIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sphereSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { mass: 1, damping: 14, stiffness: 160 } });
  const sphereOpacity = interpolate(sphereSpring, [0, 1], [0, 1]);
  const sphereScale = sphereSpring;

  // Subtle breathing after entrance
  const breathe = 1 + 0.03 * Math.sin((frame - 40) * 0.05) * (frame > 30 ? 1 : 0);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{
        opacity: sphereOpacity,
        transform: `scale(${sphereScale * breathe})`,
      }}>
        <RealisticSphere size={200} />
      </div>
    </AbsoluteFill>
  );
};

// ── Phase 2: Typewriter text ──
const TextReveal: React.FC = () => {
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 280 }}>
      <Typewriter
        text="Speech Engine"
        startFrame={10}
        charsPerFrame={3}
        showCursor
        style={{ fontSize: 64, fontWeight: 500, color: "#111", letterSpacing: "-0.01em", ...FONT }}
      />
    </AbsoluteFill>
  );
};

// ── Phase 3: Chat bubbles ──
const ChatBubbles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bubble1 = spring({ frame: Math.max(0, frame - 0), fps, config: { mass: 1, damping: 18, stiffness: 160 } });
  const bubble2 = spring({ frame: Math.max(0, frame - 12), fps, config: { mass: 1, damping: 18, stiffness: 160 } });
  const bubble3 = spring({ frame: Math.max(0, frame - 24), fps, config: { mass: 1, damping: 18, stiffness: 160 } });

  const b = (s: number) => ({
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px) scale(${interpolate(s, [0, 1], [0.95, 1])})`,
  });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 160, gap: 12, display: "flex", flexDirection: "column" }}>
      <div style={b(bubble1)}><MinimalCard>I need to reschedule my meeting</MinimalCard></div>
      <div style={b(bubble2)}><MinimalCard>Sure &mdash; moved to Thursday 2-4pm</MinimalCard></div>
      <div style={b(bubble3)}>
        <MinimalCard style={{ background: "#111", color: "#FFF", border: "none" }}>
          Confirmed &check;
        </MinimalCard>
      </div>
    </AbsoluteFill>
  );
};

// ── Phase 4: Architecture diagram ──
const ArchitectureFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const nodes = [
    { label: "Speech to Text", x: 200, y: 480 },
    { label: "LLM", x: 560, y: 360 },
    { label: "Text to Speech", x: 920, y: 240 },
    { label: "Voice Detection", x: 1280, y: 360 },
    { label: "Your App", x: 1640, y: 480 },
  ];

  return (
    <AbsoluteFill>
      {/* Connection lines */}
      <ConnectionLine
        d="M 340 480 C 420 480, 420 360, 500 360"
        startFrame={20}
        durationFrames={25}
        color="#D4D4D8"
      />
      <ConnectionLine
        d="M 620 360 C 700 360, 700 240, 860 240"
        startFrame={45}
        durationFrames={25}
        color="#D4D4D8"
      />
      <ConnectionLine
        d="M 980 240 C 1060 240, 1060 360, 1220 360"
        startFrame={70}
        durationFrames={25}
        color="#D4D4D8"
      />
      <ConnectionLine
        d="M 1340 360 C 1420 360, 1420 480, 1580 480"
        startFrame={95}
        durationFrames={25}
        color="#D4D4D8"
      />

      {/* Node cards */}
      {nodes.map((node, i) => {
        const s = spring({ frame: Math.max(0, frame - (20 + i * 25)), fps, config: { mass: 1, damping: 18, stiffness: 150 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: node.x, top: node.y,
              transform: `translate(-50%, -50%) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
              opacity: interpolate(s, [0, 1], [0, 1]),
            }}
          >
            <MinimalCard>{node.label}</MinimalCard>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ── Phase 5: Multi-language burst ──
const LANGUAGES = [
  { text: "Thanks for reaching out.", x: "50%", y: "35%" },
  { text: "Certo, sono felice di aiutarti.", x: "20%", y: "25%" },
  { text: "이메일 주소가 어떻게 되세요?", x: "75%", y: "20%" },
  { text: "ما هو عنوان بريدك الإلكتروني؟", x: "15%", y: "55%" },
  { text: "您的邮箱地址是什么？", x: "80%", y: "60%" },
  { text: "あなたのメールアドレスは？", x: "50%", y: "70%" },
];

const MultiLanguage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: "18%", left: 0, right: 0, textAlign: "center" }}>
        <span style={{ fontSize: 24, fontWeight: 500, color: "#71717A", letterSpacing: "0.05em", textTransform: "uppercase", ...FONT }}>
          Multilingual Support
        </span>
      </div>
      {LANGUAGES.map((lang, i) => {
        const s = spring({ frame: Math.max(0, frame - (10 + i * 8)), fps, config: { mass: 0.5, damping: 15, stiffness: 180 } });
        return (
          <div key={i} style={{
            position: "absolute",
            left: lang.x, top: lang.y,
            transform: `translate(-50%, -50%) scale(${interpolate(s, [0, 1], [0.8, 1])})`,
            opacity: interpolate(s, [0, 1], [0, 1]),
          }}>
            <MinimalCard style={{ fontSize: 18 }}>{lang.text}</MinimalCard>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ── Swiss SwissShowcase composition ──
export const SwissShowcase: React.FC = () => {
  return (
    <NoiseBackground opacity={0.04}>
      <Sequence from={0} durationInFrames={120}>
        <SphereIntro />
        <TextReveal />
      </Sequence>

      <Sequence from={120} durationInFrames={90}>
        <SphereIntro />
        <ChatBubbles />
      </Sequence>

      <Sequence from={210} durationInFrames={210}>
        <ArchitectureFlow />
      </Sequence>

      <Sequence from={420} durationInFrames={120}>
        <MultiLanguage />
      </Sequence>
    </NoiseBackground>
  );
};
