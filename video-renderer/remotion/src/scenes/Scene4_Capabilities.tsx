import { fontFamily } from "../fonts";
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";



const LANG_BUBBLES = [
  { text: "Thanks for reaching out.", top: "35%", left: "10%" },
  { text: "Certo, sono felice di aiutarti.", top: "15%", left: "40%" },
  { text: "이메일 주소가 어떻게 되세요?", top: "25%", right: "15%" },
  { text: "ما هو عنوان بريدك الإلكتروني؟", top: "45%", right: "30%" },
  { text: "您的邮箱地址是什么？", top: "55%", left: "30%" },
];

const CAP_LABELS = [
  { text: "Natural turn-taking", top: "32%", left: "22%", appearFrame: 180 },
  { text: "Voice detection", top: "58%", right: "25%", appearFrame: 204 },
  { text: "Interruption handling", top: "52%", left: "18%", appearFrame: 228 },
];

export const Scene4_Capabilities: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Language bubbles: 0-24 in, 72-84 out (each slightly staggered)
  const bubblesIn = interpolate(frame, [0, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.bezier(0.3, 1.2, 0.4, 1)) });
  const bubblesOut = interpolate(frame, [72, 84], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.ease) });
  const bubblesOpacity = bubblesIn * bubblesOut;
  const bubblesScale = interpolate(bubblesIn, [0, 1], [0.8, 1]) * interpolate(bubblesOut, [0, 1], [1, 0.9]);

  // Sine wave + transcription: 96-108 in, 132-144 out
  const sineOpacity = interpolate(frame, [96, 108], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(frame, [132, 144], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const transOpacity = interpolate(frame, [96, 108], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) * interpolate(frame, [132, 144], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const transY = interpolate(transOpacity, [0, 1], [10, 0]);

  // Orb: flies in 144-168 from corner
  const orbEntrance = spring({ frame: Math.max(0, Math.min(frame - 144, 24)), fps, config: { mass: 1, damping: 18, stiffness: 140 } });
  const orbOpacity = interpolate(orbEntrance, [0, 1], [0, 1]);
  const orbScale = interpolate(orbEntrance, [0, 1], [0, 1]);
  const orbX = interpolate(orbEntrance, [0, 1], [800, 0]);
  const orbY = interpolate(orbEntrance, [0, 1], [500, 0]);

  // Radar rings: 168-240 expand
  const ring1 = spring({ frame: Math.max(0, Math.min(frame - 168, 72)), fps, config: { mass: 1, damping: 20, stiffness: 100 } });
  const ring2 = spring({ frame: Math.max(0, Math.min(frame - 192, 48)), fps, config: { mass: 1, damping: 20, stiffness: 100 } });
  const ring3 = spring({ frame: Math.max(0, Math.min(frame - 216, 48)), fps, config: { mass: 1, damping: 20, stiffness: 100 } });
  const ring1Opacity = interpolate(ring1, [0, 1], [0, 0.6]);
  const ring2Opacity = interpolate(ring2, [0, 1], [0, 0.5]);
  const ring3Opacity = interpolate(ring3, [0, 1], [0, 0.4]);
  const ring1Scale = interpolate(ring1, [0, 1], [1, 2.5]);
  const ring2Scale = interpolate(ring2, [0, 1], [1, 3.5]);
  const ring3Scale = interpolate(ring3, [0, 1], [1, 4.5]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#F4F4F5" }}>
      {/* Grain */}
      <AbsoluteFill style={{ mixBlendMode: "multiply", opacity: 0.03, pointerEvents: "none", zIndex: 100 }}>
        <svg width="100%" height="100%"><filter id="g4"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" /></filter><rect width="100%" height="100%" filter="url(#g4)" /></svg>
      </AbsoluteFill>

      {/* Language bubbles */}
      {LANG_BUBBLES.map((b, i) => (
        <div key={i} style={{
          position: "absolute",
          top: b.top, left: b.left, right: b.right,
          background: "#FFF", borderRadius: 14, padding: "14px 22px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
          fontSize: 18, fontWeight: 500, color: "#18181B", whiteSpace: "nowrap",
          fontFamily: fontFamily + ", sans-serif",
          opacity: bubblesOpacity, transform: `scale(${bubblesScale})`,
          transitionDelay: `${i * 3 / fps}s`,
        }}>
          {b.text}
        </div>
      ))}

      {/* Sine waves */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 20, opacity: sineOpacity }}>
        <svg width="400" height="120" viewBox="0 0 400 120">
          <path d="M0,60 Q50,20 100,60 Q150,100 200,60 Q250,20 300,60 Q350,100 400,60" stroke="#A1A1AA" strokeWidth="1.5" fill="none" />
          <path d="M0,40 Q50,0 100,40 Q150,80 200,40 Q250,0 300,40 Q350,80 400,40" stroke="#D4D4D8" strokeWidth="1" fill="none" />
          <path d="M0,80 Q50,40 100,80 Q150,120 200,80 Q250,40 300,80 Q350,120 400,80" stroke="#D4D4D8" strokeWidth="1" fill="none" />
        </svg>
      </AbsoluteFill>

      {/* Transcription text */}
      <div style={{ position: "absolute", top: "30%", left: 0, right: 0, textAlign: "center", fontSize: 36, fontWeight: 600, color: "#18181B", zIndex: 30, opacity: transOpacity, transform: `translateY(${transY}px)`, fontFamily: fontFamily + ", sans-serif" }}>
        Industry-leading transcription
      </div>

      {/* Orb */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 40 }}>
        <div style={{
          width: 200, height: 200, borderRadius: 100,
          background: "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F5F5F5 8%, #D4D4D8 20%, #A1A1AA 40%, #52525B 65%, #27272A 85%, #18181B 100%)",
          boxShadow: "inset -14px -14px 30px rgba(0,0,0,0.55), 0px 24px 48px rgba(0,0,0,0.18)",
          opacity: orbOpacity, transform: `scale(${orbScale}) translate(${orbX}px, ${orbY}px)`,
        }} />
      </AbsoluteFill>

      {/* Radar rings */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 15 }}>
        {[{ op: ring1Opacity, sc: ring1Scale, sz: 250 },
          { op: ring2Opacity, sc: ring2Scale, sz: 350 },
          { op: ring3Opacity, sc: ring3Scale, sz: 450 }].map((r, i) => (
          <div key={i} style={{ position: "absolute", width: r.sz, height: r.sz, borderRadius: "50%", border: "1px solid #D4D4D8", opacity: r.op, transform: `scale(${r.sc})` }} />
        ))}
      </AbsoluteFill>

      {/* Capability labels */}
      {CAP_LABELS.map((c, i) => {
        const labelIn = spring({ frame: Math.max(0, Math.min(frame - c.appearFrame, 10)), fps, config: { mass: 1, damping: 15, stiffness: 180 } });
        const labelOpacity = interpolate(labelIn, [0, 1], [0, 1]);
        const labelY = interpolate(labelIn, [0, 1], [10, 0]);
        const labelScale = interpolate(labelIn, [0, 1], [0.9, 1]);
        return (
          <div key={i} style={{
            position: "absolute", top: c.top, left: c.left, right: c.right,
            fontSize: 18, fontWeight: 500, color: "#18181B",
            fontFamily: fontFamily + ", sans-serif",
            background: "#FFF", borderRadius: 10, padding: "10px 18px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            opacity: labelOpacity, transform: `translateY(${labelY}px) scale(${labelScale})`,
            zIndex: 50,
          }}>
            {c.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
