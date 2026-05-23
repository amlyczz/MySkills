import { fontFamily } from "../fonts";
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, Sequence } from "remotion";

const BG_LIGHT = "#F4F4F5";
const BG_DARK = "#18181B";


export const Scene1_Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background: light → dark starting frame 120
  const bgProgress = interpolate(frame, [120, 168], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const bgColor = `rgb(${Math.round(244 + (24-244)*bgProgress)}, ${Math.round(244 + (24-244)*bgProgress)}, ${Math.round(245 + (27-245)*bgProgress)})`;

  // Text: "ElevenLabs" fades in 0-12, morphs at 36, fades out 72-80
  const textFadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const textFadeOut1 = interpolate(frame, [34, 36], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textFadeIn2 = interpolate(frame, [36, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textFadeOut2 = interpolate(frame, [72, 80], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.ease) });

  const textOpacity = frame < 36 ? textFadeIn * textFadeOut1 : textFadeIn2 * textFadeOut2;
  const displayText = frame < 36 ? "ElevenLabs" : "Speech Engine";

  // Chat bubble: frames 90-105, Apple easing
  const chatSpring = spring({ frame: Math.max(0, frame - 90), fps, config: { mass: 1, damping: 20, stiffness: 200 } });
  const chatOpacity = interpolate(chatSpring, [0, 1], [0, 1]);
  const chatScale = interpolate(chatSpring, [0, 1], [0.95, 1]);
  const chatY = interpolate(chatSpring, [0, 1], [-12, 0]);

  // Toggle: appears 120-135, switches 135-145
  const tglOpacity = interpolate(frame, [120, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
  const tglSwitch = interpolate(frame, [135, 145], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const knobX = interpolate(tglSwitch, [0, 1], [0, 26]);
  const pillColor = tglSwitch > 0.5 ? "#34C759" : "#E5E5E5";

  // Orb: frames 145-155, overshoot
  const orbSpring = spring({ frame: Math.max(0, frame - 145), fps, config: { mass: 1, damping: 12, stiffness: 200 } });
  const orbOpacity = interpolate(orbSpring, [0, 1], [0, 1]);
  const orbScale = orbSpring;

  // Scene 1 transition out: fade to black 156-168
  const curtainOpacity = interpolate(frame, [156, 168], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.linear) });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {/* Film grain */}
      <AbsoluteFill style={{ mixBlendMode: "multiply", opacity: 0.08, pointerEvents: "none", zIndex: 100 }}>
        <svg width="100%" height="100%">
          <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>

      {/* Dynamic text */}
      <Sequence from={0} durationInFrames={84}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <span style={{ fontSize: 88, fontWeight: 600, color: "#111111", letterSpacing: "-0.02em", opacity: textOpacity, fontFamily: fontFamily + ", sans-serif" }}>
            {displayText}
          </span>
        </AbsoluteFill>
      </Sequence>

      {/* Chat bubble */}
      <Sequence from={90} durationInFrames={15}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", padding: "20px 28px",
            background: "#FFFFFF", borderRadius: 20,
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            opacity: chatOpacity, transform: `scale(${chatScale}) translateY(${chatY}px)`,
          }}>
            <span style={{ fontSize: 24, fontWeight: 500, color: "#333", letterSpacing: "-0.01em", fontFamily: fontFamily + ", sans-serif" }}>
              I need to reschedule my meeting...
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Toggle */}
      <Sequence from={120} durationInFrames={25}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: tglOpacity }}>
            <div style={{ width: 56, height: 30, borderRadius: 15, background: pillColor, position: "relative" }}>
              <div style={{ position: "absolute", top: 2, left: 2, width: 26, height: 26, borderRadius: 13, background: "#FFF", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", transform: `translateX(${knobX}px)` }} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 500, color: "#666", letterSpacing: "-0.01em", fontFamily: fontFamily + ", sans-serif" }}>Speech Engine</span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Voice orb */}
      <Sequence from={145} durationInFrames={15}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{
            width: 200, height: 200, borderRadius: 100,
            background: "radial-gradient(circle at 32% 32%, #FFFFFF 0%, #C8C8CC 20%, #6B6B72 55%, #2C2C30 85%, #18181B 100%)",
            boxShadow: "inset -14px -14px 30px rgba(0,0,0,0.55), 0px 24px 48px rgba(0,0,0,0.18)",
            opacity: orbOpacity, transform: `scale(${orbScale})`,
          }} />
        </AbsoluteFill>
      </Sequence>

      {/* Fade to black curtain */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: curtainOpacity, pointerEvents: "none", zIndex: 200 }} />
    </AbsoluteFill>
  );
};
