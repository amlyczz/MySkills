import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, Easing } from "remotion";
import { FluidMeshGradient } from "./components/glassmorphism/FluidMeshGradient";
import { BlurFadeText } from "./components/glassmorphism/BlurFadeText";
import { GlassUIWindow } from "./components/glassmorphism/GlassUIWindow";
import { GlowBarChart } from "./components/glassmorphism/GlowBarChart";
import { TypingMessage } from "./components/glassmorphism/TypingMessage";
import { ChipCard } from "./components/content/ChipCard";
import { BranchFlow } from "./components/content/BranchFlow";
import { AnimatedCounter } from "./components/content/AnimatedCounter";
import { RadialGlow } from "./components/decoration/RadialGlow";
import { ParticleField } from "./components/decoration/ParticleField";
import { IconBadge } from "./components/decoration/IconBadge";

/**
 * Command A+ Showcase v2 — 11 scenes, different palette & animation config
 * For visual comparison with GlassmorphismShowcase (7 scenes).
 *
 * Total: ~63s (1890 frames @ 30fps)
 */

const FPS = 30;

/* ── Scene boundaries ── */
const S = {
  intro:       { from: 0,    dur: 90 },    // 0-3s
  tagline:     { from: 90,   dur: 150 },   // 3-8s
  opensource:  { from: 240,  dur: 120 },   // 8-12s
  arch:        { from: 360,  dur: 120 },   // 12-16s
  perf:        { from: 480,  dur: 390 },   // 16-29s
  security:    { from: 870,  dur: 90 },    // 29-32s
  gpu:         { from: 960,  dur: 90 },    // 32-35s
  unified:     { from: 1050, dur: 360 },   // 35-47s
  languages:   { from: 1410, dur: 120 },   // 47-51s
  funcall:     { from: 1530, dur: 180 },   // 51-57s
  outro:       { from: 1710, dur: 180 },   // 57-63s
};

/* ── Palette (different from v1) ── */
const C = {
  blue: "#0078D7",
  red: "#FF4D4D",
  yellow: "#FFD700",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.6)",
  dim: "rgba(255,255,255,0.35)",
  gradientBg: ["#00B4D8", "#FF6B6B", "#FFD166", "#0A1628"],
};

/* ── Spring configs (different from v1) ── */
const SPRING_TITLE = { damping: 15, stiffness: 200, mass: 0.8 };
const SPRING_CARD = { damping: 12, stiffness: 180, mass: 0.7 };
const SPRING_LOGO = { damping: 18, stiffness: 220, mass: 0.9 };

/* ── helpers ── */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ═══════════════════════ Scene 1: Intro ═══════════════════════ */
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = spring({ frame, fps: FPS, config: SPRING_LOGO, delay: 15 });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity, transform: `scale(${scale})` }}>
        <div style={{ fontSize: 96, fontWeight: 800, color: C.white, fontFamily: "'Inter', sans-serif", letterSpacing: -2 }}>
          Command A+
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <BlurFadeText text="by Cohere" fontSize={28} fontWeight={400} color={C.muted} delay={35} duration={15} textAlign="center" />
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════ Scene 2: Tagline ═══════════════════════ */
const TaglineScene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
    <BlurFadeText
      text="Our fastest and most"
      fontSize={64}
      fontWeight={800}
      color={C.white}
      delay={5}
      duration={18}
      textAlign="center"
    />
    <BlurFadeText
      text="powerful model to date."
      fontSize={64}
      fontWeight={800}
      color={C.yellow}
      delay={22}
      duration={18}
      textAlign="center"
    />
    {/* Light rays */}
    <RadialGlow delay={10} color={C.yellow} />
  </AbsoluteFill>
);

/* ═══════════════════════ Scene 3: Open Source ═══════════════════════ */
const OpenSourceScene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 160, paddingRight: 160 }}>
    <BlurFadeText text="It's open source," fontSize={56} fontWeight={700} color={C.white} delay={0} duration={18} />
    <BlurFadeText text="bringing sovereign AI to all." fontSize={56} fontWeight={700} color={C.blue} delay={18} duration={18} />
    <ParticleField delay={30} color={C.white} shape="diamond" count={5} seed={42} />
  </AbsoluteFill>
);

/* ═══════════════════════ Scene 4: Architecture ═══════════════════════ */
const ArchitectureScene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 30 }}>
    <BlurFadeText
      text="Built with an efficient"
      fontSize={48}
      fontWeight={700}
      color={C.white}
      delay={0}
      duration={18}
      textAlign="center"
    />
    <BlurFadeText
      text="mixture-of-experts architecture."
      fontSize={48}
      fontWeight={700}
      color={C.red}
      delay={15}
      duration={18}
      textAlign="center"
    />
    <BranchFlow
      sourceLabel="Router"
      sourceColor={C.blue}
      branches={[
        { label: "Expert 1", color: C.blue },
        { label: "Expert 2", color: C.red },
        { label: "Expert 3", color: C.blue },
        { label: "Expert 4", color: C.red },
      ]}
      delay={30}
    />
  </AbsoluteFill>
);

/* ═══════════════════════ Scene 5: Performance ═══════════════════════ */
const perfBars = [
  { label: "t²-Bench Telecom", percentage: 85, baselinePercentage: 37, barColor: "#FF4D4D" },
  { label: "t²-Bench Finance", percentage: 78, baselinePercentage: 41, barColor: "#FFD700" },
  { label: "AIME 25", percentage: 90, baselinePercentage: 65, barColor: "#0078D7" },
  { label: "IFEval Strict", percentage: 91, baselinePercentage: 68, barColor: "#00B4D8" },
  { label: "BFCL v3", percentage: 72, baselinePercentage: 55, barColor: "#7C3AED" },
];

const PerformanceScene: React.FC = () => (
  <AbsoluteFill style={{ paddingLeft: 120, paddingRight: 120, paddingTop: 120, paddingBottom: 60 }}>
    <BlurFadeText text="Performance that matters" fontSize={52} fontWeight={700} color={C.white} delay={0} duration={18} />
    <BlurFadeText text="vs. leading open models" fontSize={24} fontWeight={400} color={C.dim} delay={12} duration={15} />

    <div style={{ marginTop: 50 }}>
      <GlowBarChart bars={perfBars} delay={25} barDuration={40} barGap={10} barHeight={40} labelWidth={240} fontSize={18} />
    </div>

    <div style={{ marginTop: 24, display: "flex", gap: 20 }}>
      <LegendDot color={C.red} label="Command A+" />
      <LegendDot color="rgba(255,255,255,0.2)" label="Baseline" />
    </div>
  </AbsoluteFill>
);

/* ═══════════════════════ Scene 6: Security ═══════════════════════ */
const SecurityScene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
    <BlurFadeText
      text="Run secure,"
      fontSize={64}
      fontWeight={800}
      color={C.white}
      delay={0}
      duration={18}
      textAlign="center"
    />
    <BlurFadeText
      text="enterprise-grade agentic workflows."
      fontSize={64}
      fontWeight={800}
      color={C.blue}
      delay={15}
      duration={18}
      textAlign="center"
    />
    <IconBadge variant="shield" color={C.blue} delay={30} />
  </AbsoluteFill>
);

/* ═══════════════════════ Scene 7: GPU Requirement ═══════════════════════ */
const GPURequirementScene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 40 }}>
    <BlurFadeText text="with as little as" fontSize={52} fontWeight={700} color={C.white} delay={0} duration={18} textAlign="center" />
    <BlurFadeText text="two GPUs." fontSize={72} fontWeight={800} color={C.yellow} delay={12} duration={18} textAlign="center" />

    <div style={{ display: "flex", gap: 60, marginTop: 30 }}>
      <ChipCard delay={25} label="GPU 1" color={C.blue} sublabel="NVIDIA A100 80GB">
        <svg width="70" height="45" viewBox="0 0 70 45" fill="none" style={{ marginBottom: 10 }}>
          <rect x="5" y="5" width="60" height="35" rx="3" stroke={C.blue} strokeWidth="1.5" fill="none" opacity="0.6" />
          <rect x="12" y="11" width="18" height="23" rx="2" stroke={C.blue} strokeWidth="1" fill="none" opacity="0.4" />
          <rect x="35" y="11" width="18" height="23" rx="2" stroke={C.blue} strokeWidth="1" fill="none" opacity="0.4" />
        </svg>
      </ChipCard>
      <ChipCard delay={40} label="GPU 2" color={C.red} sublabel="NVIDIA A100 80GB">
        <svg width="70" height="45" viewBox="0 0 70 45" fill="none" style={{ marginBottom: 10 }}>
          <rect x="5" y="5" width="60" height="35" rx="3" stroke={C.red} strokeWidth="1.5" fill="none" opacity="0.6" />
          <rect x="12" y="11" width="18" height="23" rx="2" stroke={C.red} strokeWidth="1" fill="none" opacity="0.4" />
          <rect x="35" y="11" width="18" height="23" rx="2" stroke={C.red} strokeWidth="1" fill="none" opacity="0.4" />
        </svg>
      </ChipCard>
    </div>
  </AbsoluteFill>
);

/* ═══════════════════════ Scene 8: Unified Model ═══════════════════════ */
const features = [
  {
    title: "KYC Onboarding Agent",
    desc: "An agent to process new banking customer applications with autonomous document verification.",
    icon: "A",
    delay: 15,
  },
  {
    title: "Personal Assistant",
    desc: "An agent that can help you with everything from email to task management.",
    icon: "P",
    delay: 50,
  },
  {
    title: "Reasoning Engine",
    desc: "Chain-of-thought reasoning for complex multi-step problem solving.",
    icon: "R",
    delay: 85,
  },
];

const UnifiedModelScene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 160, paddingRight: 160 }}>
    <BlurFadeText text="One unified model" fontSize={52} fontWeight={700} color={C.white} delay={0} duration={18} />

    <div style={{ display: "flex", gap: 24, marginTop: 40 }}>
      {features.map((f) => (
        <GlassUIWindow
          key={f.title}
          width={380}
          height={240}
          delay={f.delay}
          borderRadius={20}
          opacity={0.06}
          position="relative"
        >
          <div style={{ padding: 24 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, ${C.blue}, ${C.red})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 800, color: C.white, marginBottom: 14,
            }}>
              {f.icon}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
              {f.title}
            </div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
              {f.desc}
            </div>
          </div>
        </GlassUIWindow>
      ))}
    </div>

    <div style={{ marginTop: 24 }}>
      <GlassUIWindow width={640} height={280} delay={120} borderRadius={20} opacity={0.05} position="relative">
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 600, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
            AGENTIC REASONING
          </div>
          <TypingMessage
            content="I'll verify the applicant's ID document first, then cross-reference with the banking database..."
            typingSpeed={1.8}
            delay={140}
            sender="Command A+"
            avatar="C"
            fontSize={15}
          />
        </div>
      </GlassUIWindow>
    </div>
  </AbsoluteFill>
);

/* ═══════════════════════ Scene 9: Languages ═══════════════════════ */
const langs = [
  "Arabic", "Bulgarian", "Bengali", "Chinese", "Czech", "Danish", "Dutch",
  "English", "Finnish", "French", "German", "Greek", "Hebrew", "Hindi",
  "Hungarian", "Indonesian", "Italian", "Japanese", "Korean", "Malay",
  "Norwegian", "Polish", "Portuguese", "Romanian", "Russian", "Spanish",
  "Swedish", "Thai", "Turkish", "Ukrainian", "Urdu", "Vietnamese",
];

const LanguagesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollY = interpolate(frame, [0, 120], [0, -(langs.length * 36)], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 160, paddingRight: 160 }}>
      <BlurFadeText text="Supporting 48 world languages" fontSize={52} fontWeight={700} color={C.white} delay={0} duration={18} />

      <div style={{ display: "flex", gap: 40, marginTop: 40 }}>
        <div style={{ flex: 1, height: 400, overflow: "hidden", position: "relative" }}>
          <div style={{ transform: `translateY(${scrollY}px)` }}>
            {langs.map((lang, i) => (
              <div key={lang} style={{
                fontSize: 22, fontWeight: 500, color: i % 3 === 0 ? C.blue : i % 3 === 1 ? C.white : C.yellow,
                fontFamily: "'Inter', sans-serif", padding: "6px 0", opacity: 0.8,
              }}>
                {lang}
              </div>
            ))}
          </div>
          {/* Fade mask top/bottom */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to bottom, rgba(10,22,40,0.9), transparent)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to top, rgba(10,22,40,0.9), transparent)" }} />
        </div>

        {/* Right side: language count highlight */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AnimatedCounter target={48} suffix=" languages" delay={15} color={C.yellow} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════ Scene 10: Function Calling ═══════════════════════ */
const FunctionCallingScene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 160, paddingRight: 160 }}>
    <BlurFadeText text="With function calling" fontSize={52} fontWeight={700} color={C.white} delay={0} duration={18} />
    <BlurFadeText text="and structured outputs" fontSize={36} fontWeight={400} color={C.muted} delay={12} duration={15} />

    <div style={{ display: "flex", gap: 40, marginTop: 50 }}>
      {/* Code snippet */}
      <GlassUIWindow width={560} height={300} delay={25} borderRadius={16} opacity={0.05} position="relative">
        <div style={{ padding: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: C.muted, lineHeight: 1.8 }}>
          <span style={{ color: "#7C3AED" }}>import</span> cohere<br />
          <br />
          <span style={{ color: C.dim }}>response = client.chat(</span><br />
          <span style={{ color: C.dim }}>  model=</span><span style={{ color: C.yellow }}>"command-a-plus"</span><span style={{ color: C.dim }}>,</span><br />
          <span style={{ color: C.dim }}>  tools=[{"{search}"}, {"{calc}"}],</span><br />
          <span style={{ color: C.dim }}>  response_format={"{"}</span><br />
          <span style={{ color: C.dim }}>    "type": </span><span style={{ color: C.yellow }}>"json_object"</span><br />
          <span style={{ color: C.dim }}>  {"}"}</span><br />
          <span style={{ color: C.dim }}>)</span>
        </div>
      </GlassUIWindow>

      {/* Structured output preview */}
      <GlassUIWindow width={480} height={300} delay={45} borderRadius={16} opacity={0.05} position="relative">
        <div style={{ padding: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: C.muted, lineHeight: 1.8 }}>
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 600, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
            STRUCTURED OUTPUT
          </div>
          <span style={{ color: C.dim }}>{"{"}</span><br />
          <span style={{ color: C.dim }}>  </span><span style={{ color: C.blue }}>"action"</span><span style={{ color: C.dim }}>: </span><span style={{ color: C.yellow }}>"run_migration"</span><span style={{ color: C.dim }}>,</span><br />
          <span style={{ color: C.dim }}>  </span><span style={{ color: C.blue }}>"target_db"</span><span style={{ color: C.dim }}>: </span><span style={{ color: C.yellow }}>"production"</span><span style={{ color: C.dim }}>,</span><br />
          <span style={{ color: C.dim }}>  </span><span style={{ color: C.blue }}>"confidence"</span><span style={{ color: C.dim }}>: </span><span style={{ color: C.red }}>0.97</span><br />
          <span style={{ color: C.dim }}>{"}"}</span>
        </div>
      </GlassUIWindow>
    </div>
  </AbsoluteFill>
);

/* ═══════════════════════ Scene 11: Outro ═══════════════════════ */
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = spring({ frame, fps: FPS, config: SPRING_LOGO, delay: 30 });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity, transform: `scale(${scale})` }}>
        <div style={{ fontSize: 96, fontWeight: 800, color: C.white, fontFamily: "'Inter', sans-serif", letterSpacing: -2, textAlign: "center" }}>
          Own your AI.
        </div>
      </div>
      <div style={{ marginTop: 30 }}>
        <div style={{
          fontSize: 36, fontWeight: 600, color: C.blue, fontFamily: "'Inter', sans-serif",
          opacity: interpolate(frame, [45, 65], [0, 1], { extrapolateRight: "clamp" }),
          textAlign: "center",
        }}>
          Cohere
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════════════ Utility Components ═══════════════════════ */

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Inter', sans-serif" }}>
    <div style={{ width: 12, height: 12, borderRadius: 6, background: color }} />
    <span style={{ fontSize: 14, color: C.dim }}>{label}</span>
  </div>
);

/* ═══════════════════════ Main Composition ═══════════════════════ */

export const CommandAPlusShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0A1628", overflow: "hidden" }}>
      {/* Global background: different gradient colors than v1 */}
      <FluidMeshGradient colors={C.gradientBg} speed={0.5} />
      <AbsoluteFill style={{ background: "rgba(10,22,40,0.35)", zIndex: 1 }} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
        <Sequence from={S.intro.from} durationInFrames={S.intro.dur}>
          <IntroScene />
        </Sequence>
        <Sequence from={S.tagline.from} durationInFrames={S.tagline.dur}>
          <TaglineScene />
        </Sequence>
        <Sequence from={S.opensource.from} durationInFrames={S.opensource.dur}>
          <OpenSourceScene />
        </Sequence>
        <Sequence from={S.arch.from} durationInFrames={S.arch.dur}>
          <ArchitectureScene />
        </Sequence>
        <Sequence from={S.perf.from} durationInFrames={S.perf.dur}>
          <PerformanceScene />
        </Sequence>
        <Sequence from={S.security.from} durationInFrames={S.security.dur}>
          <SecurityScene />
        </Sequence>
        <Sequence from={S.gpu.from} durationInFrames={S.gpu.dur}>
          <GPURequirementScene />
        </Sequence>
        <Sequence from={S.unified.from} durationInFrames={S.unified.dur}>
          <UnifiedModelScene />
        </Sequence>
        <Sequence from={S.languages.from} durationInFrames={S.languages.dur}>
          <LanguagesScene />
        </Sequence>
        <Sequence from={S.funcall.from} durationInFrames={S.funcall.dur}>
          <FunctionCallingScene />
        </Sequence>
        <Sequence from={S.outro.from} durationInFrames={S.outro.dur}>
          <OutroScene />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};
