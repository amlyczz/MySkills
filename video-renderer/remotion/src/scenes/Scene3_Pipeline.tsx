import { fontFamily } from "../fonts";
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";



const PIPE_ITEMS = ["Speech to Text", "Turn Taking", "Voice Activity Detection", "Text to Speech", "Interruption Detection"];
const ARCH_ITEMS = ["System prompt", "Knowledge base", "RAG", "LLM", "Workflows & Routing"];
const ARCH_STARTS = [240, 245, 250, 260, 270];

export const Scene3_Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background: #18181B (0-110) → #71717A (110-130) → #F4F4F5 (130-210)
  const bgPhase1 = interpolate(frame, [110, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const bgPhase2 = interpolate(frame, [130, 210], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const bgR = Math.round(24 + (113 - 24) * bgPhase1 + (244 - 113) * bgPhase2);
  const bgG = Math.round(24 + (113 - 24) * bgPhase1 + (244 - 113) * bgPhase2);
  const bgB = Math.round(27 + (122 - 27) * bgPhase1 + (245 - 122) * bgPhase2);
  const bgColor = `rgb(${bgR},${bgG},${bgB})`;

  // Noise texture
  const noiseOpacity = interpolate(frame, [110, 130, 190, 210], [0, 0.4, 0.4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Orb: shrink + move
  const orbPhase1 = spring({ frame: Math.min(frame, 30), fps, config: { mass: 1, damping: 18, stiffness: 150 } });
  const orbPhase2 = spring({ frame: Math.max(0, Math.min(frame - 30, 90)), fps, config: { mass: 1, damping: 18, stiffness: 140 } });
  const orbScale = 1 - 0.6 * orbPhase1 - 0.1 * orbPhase2;
  const orbX = 280 * orbPhase1 + (-720) * orbPhase2;
  const orbY = -80 * orbPhase1 + (-40) * orbPhase2;
  const orbFade = interpolate(frame, [208, 220], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.linear) });

  // Pipeline list
  const pipeIn = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const pipeY = interpolate(pipeIn, [0, 1], [20, 0]);
  const pipeOut = interpolate(frame, [70, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.ease) });

  // Merge box
  const mergeIn = spring({ frame: Math.max(0, Math.min(frame - 75, 20)), fps, config: { mass: 1, damping: 14, stiffness: 170 } });
  const mergeScaleY = interpolate(mergeIn, [0, 1], [1.5, 1]);
  const mergeOpacity = interpolate(frame, [75, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(frame, [95, 115], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.ease) });

  // Speech Engine icon
  const seEntrance = spring({ frame: Math.max(0, Math.min(frame - 110, 20)), fps, config: { mass: 1, damping: 18, stiffness: 150 } });
  const seX = interpolate(seEntrance, [0, 1], [0, -440]);
  const seOpacity = interpolate(frame, [110, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(frame, [220, 230], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Client card
  const cardEntrance = spring({ frame: Math.max(0, Math.min(frame - 160, 20)), fps, config: { mass: 1, damping: 18, stiffness: 150 } });
  const cardOpacity = interpolate(cardEntrance, [0, 1], [0, 1]);
  const cardX = interpolate(cardEntrance, [0, 1], [100, 440]);
  const cardToHeader = spring({ frame: Math.max(0, Math.min(frame - 210, 20)), fps, config: { mass: 1, damping: 16, stiffness: 130 } });
  const cardFinalX = interpolate(cardToHeader, [0, 1], [440, 0]);
  const cardFinalY = interpolate(cardToHeader, [0, 1], [0, -420]);
  const cardFinalScale = 1 + 0.2 * cardToHeader;
  const cardFinalOpacity = cardOpacity * interpolate(frame, [226, 230], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Connection path
  const connOpacity = interpolate(frame, [170, 172], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(frame, [210, 215], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const connDash = interpolate(frame, [170, 190], [1000, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Header bar
  const hdrOpacity = interpolate(frame, [230, 242], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const hdrY = interpolate(hdrOpacity, [0, 1], [-20, 0]);

  // Architecture grid
  const archOpacity = interpolate(frame, [230, 280], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const archY = interpolate(archOpacity, [0, 1], [50, 0]);

  // Integrations
  const integOpacity = interpolate(frame, [270, 300], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.bezier(0.3, 1.2, 0.4, 1)) });
  const integY = interpolate(integOpacity, [0, 1], [20, 0]);

  // Transition: fade to white 314-324
  const whiteCurtain = interpolate(frame, [314, 324], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.linear) });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {/* Grain + noise */}
      <AbsoluteFill style={{ mixBlendMode: "multiply", opacity: 0.05, pointerEvents: "none", zIndex: 100 }}>
        <svg width="100%" height="100%"><filter id="g3"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" /></filter><rect width="100%" height="100%" filter="url(#g3)" /></svg>
      </AbsoluteFill>
      <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: noiseOpacity, pointerEvents: "none", zIndex: 101 }}>
        <svg width="100%" height="100%"><filter id="n3"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" stitchTiles="stitch" /></filter><rect width="100%" height="100%" filter="url(#n3)" /></svg>
      </AbsoluteFill>

      {/* Orb */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 50 }}>
        <div style={{
          width: 200, height: 200, borderRadius: 100,
          background: "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F5F5F5 8%, #D4D4D8 20%, #A1A1AA 40%, #52525B 65%, #27272A 85%, #18181B 100%)",
          boxShadow: "inset -14px -14px 30px rgba(0,0,0,0.55), 0 0 60px rgba(228,228,231,0.12)",
          transform: `scale(${orbScale}) translate(${orbX}px, ${orbY}px)`,
          opacity: orbFade,
        }} />
      </AbsoluteFill>

      {/* Pipeline list */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 20, opacity: pipeIn * pipeOut, transform: `translateY(${pipeY}px)` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PIPE_ITEMS.map((item, i) => (
            <div key={i} style={{ background: "rgba(24,24,27,0.9)", border: "1.5px solid #3F3F46", borderRadius: 10, padding: "12px 24px", fontSize: 20, fontWeight: 500, color: "#D4D4D8", textAlign: "center", fontFamily: fontFamily + ", sans-serif" }}>
              {item}
            </div>
          ))}
        </div>
      </AbsoluteFill>

      {/* Merge box */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 15 }}>
        <div style={{ width: 340, height: 220, border: "2px solid #A1A1AA", borderRadius: 16, opacity: mergeOpacity, transform: `scaleY(${mergeScaleY})` }} />
      </AbsoluteFill>

      {/* Speech Engine icon */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: seOpacity, transform: `translateX(${seX}px)` }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "radial-gradient(circle at 35% 30%, #FFF 0%, #D4D4D8 30%, #71717A 65%, #3F3F46 100%)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }} />
          <span style={{ fontSize: 22, fontWeight: 600, color: "#18181B", letterSpacing: "-0.01em", fontFamily: fontFamily + ", sans-serif" }}>Speech Engine</span>
        </div>
      </AbsoluteFill>

      {/* Client card */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 30 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "16px 24px",
          background: "#FFF", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          opacity: cardFinalOpacity, transform: `translate(${frame >= 210 ? cardFinalX : cardX}px, ${frame >= 210 ? cardFinalY : 0}px) scale(${cardFinalScale})`,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }} />
          <span style={{ fontSize: 20, fontWeight: 500, color: "#18181B", fontFamily: fontFamily + ", sans-serif" }}>Your agent</span>
        </div>
      </AbsoluteFill>

      {/* Connection path */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 25, opacity: connOpacity }}>
        <svg width="1920" height="200" viewBox="0 0 1920 200">
          <path d="M 460 100 Q 960 40 1460 100" stroke="#D4D4D8" strokeWidth={2} strokeDasharray="1000" strokeDashoffset={connDash} fill="none" />
        </svg>
      </AbsoluteFill>

      {/* Header bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, display: "flex", alignItems: "center", padding: "0 60px", zIndex: 30, opacity: hdrOpacity, transform: `translateY(${hdrY}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", background: "#FFF", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ width: 24, height: 24, borderRadius: 12, background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }} />
          <span style={{ fontSize: 18, fontWeight: 600, color: "#18181B", fontFamily: fontFamily + ", sans-serif" }}>Your agent</span>
        </div>
      </div>

      {/* Architecture grid */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 20, opacity: archOpacity, transform: `translateY(${archY}px)` }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, maxWidth: 900, justifyContent: "center" }}>
          {ARCH_ITEMS.map((label, i) => {
            const itemIn = interpolate(frame, [ARCH_STARTS[i], ARCH_STARTS[i] + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
            const isHL = i === 3;
            return (
              <div key={i} style={{
                background: isHL ? "#18181B" : "#FFF", color: isHL ? "#FFF" : "#18181B",
                borderRadius: 14, padding: "18px 28px", fontSize: 18, fontWeight: 500,
                boxShadow: isHL ? "0 4px 20px rgba(0,0,0,0.15)" : "0 2px 16px rgba(0,0,0,0.06)",
                textAlign: "center", opacity: itemIn, fontFamily: fontFamily + ", sans-serif",
                transform: `translateY(${interpolate(itemIn, [0, 1], [10, 0])}px)`,
              }}>
                {label}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Integrations */}
      <div style={{ position: "absolute", right: 80, top: "50%", transform: `translateY(-50%) translateY(${integY}px)`, zIndex: 20, opacity: integOpacity }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#18181B", marginBottom: 14, fontFamily: fontFamily + ", sans-serif" }}>Integrations</div>
        {["CRM", "Ticketing", "Billing", "Any system, API or webhook"].map((item, i) => (
          <div key={i} style={{ fontSize: 17, fontWeight: 400, color: "#52525B", padding: "6px 0", display: "flex", alignItems: "center", gap: 8, fontFamily: fontFamily + ", sans-serif" }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: "#A1A1AA", display: "inline-block" }} />{item}
          </div>
        ))}
      </div>

      {/* Fade to white */}
      <AbsoluteFill style={{ backgroundColor: "#FFF", opacity: whiteCurtain, pointerEvents: "none", zIndex: 200 }} />
    </AbsoluteFill>
  );
};
