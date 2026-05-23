import { fontFamily } from "../fonts";
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";



export const Scene5_Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Shield: 0-12 expand in, 60-84 expand out + fade
  const shieldIn = spring({ frame: Math.min(frame, 12), fps, config: { mass: 1, damping: 16, stiffness: 170 } });
  const shieldOpacity = interpolate(shieldIn, [0, 1], [0, 0.8]) * interpolate(frame, [60, 84], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.ease) });
  const shieldScale = interpolate(shieldIn, [0, 1], [0.5, 1.2]) + interpolate(frame, [60, 84], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shieldRadius = interpolate(shieldIn, [0, 1], [100, 40]);

  // Orbiting nodes: rotation 0-48 (90°), fade 64-72
  const nodeRotation = interpolate(frame, [0, 48], [0, Math.PI / 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nodesOpacity = interpolate(frame, [64, 72], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nodeRadius = 120;

  // Orb: 0-60 at center scale 1, 60-96 shrink+move to corner
  const orbShrink = spring({ frame: Math.max(0, Math.min(frame - 60, 36)), fps, config: { mass: 1, damping: 16, stiffness: 120 } });
  const orbScale = 1 - 0.88 * orbShrink;
  const orbX = interpolate(orbShrink, [0, 1], [0, 180]);
  const orbY = interpolate(orbShrink, [0, 1], [0, 0]);

  // "Secured" text: 12-24 in, 60-72 out
  const securedIn = spring({ frame: Math.max(0, Math.min(frame - 12, 12)), fps, config: { mass: 1, damping: 14, stiffness: 170 } });
  const securedOpacity = interpolate(frame, [12, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(frame, [60, 72], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.ease) });

  // Logo morph: "Eleven API" 90-105 in, 140 fade, 145 morph to "ElevenLabs"
  const logoIn = interpolate(frame, [90, 105], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const logoOut1 = interpolate(frame, [140, 145], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoIn2 = spring({ frame: Math.max(0, Math.min(frame - 145, 10)), fps, config: { mass: 1, damping: 14, stiffness: 180 } });
  const logoPhase = frame < 145 ? "first" : "second";
  const logoText = frame < 145 ? "Eleven API" : "ElevenLabs";
  const logoOpacity = frame < 145 ? (logoIn * logoOut1) : interpolate(logoIn2, [0, 1], [0, 1]);

  // CTA: 168-184 slide up + fade in
  const ctaOpacity = interpolate(frame, [168, 184], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const ctaY = interpolate(ctaOpacity, [0, 1], [20, 0]);

  // Transition: fade to white 216-240
  const whiteCurtain = interpolate(frame, [216, 240], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.linear) });

  return (
    <AbsoluteFill style={{ backgroundColor: "#F4F4F5" }}>
      {/* Grain */}
      <AbsoluteFill style={{ mixBlendMode: "multiply", opacity: 0.03, pointerEvents: "none", zIndex: 100 }}>
        <svg width="100%" height="100%"><filter id="g5"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" /></filter><rect width="100%" height="100%" filter="url(#g5)" /></svg>
      </AbsoluteFill>

      {/* Security shield */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 10 }}>
        <div style={{
          width: 500, height: 500,
          border: "1.5px solid #A1A1AA",
          borderRadius: `${shieldRadius}px`,
          opacity: shieldOpacity,
          transform: `scale(${shieldScale})`,
        }} />
      </AbsoluteFill>

      {/* Orbiting nodes */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 15, opacity: nodesOpacity }}>
        {[0, 120, 240].map((offset, i) => {
          const angle = (offset * Math.PI / 180) + nodeRotation;
          return (
            <div key={i} style={{
              position: "absolute",
              width: 8, height: 8, borderRadius: 4,
              background: "#FFFFFF", boxShadow: "0 0 8px rgba(0,0,0,0.1)",
              transform: `translate(${Math.cos(angle) * nodeRadius}px, ${Math.sin(angle) * nodeRadius}px)`,
            }} />
          );
        })}
      </AbsoluteFill>

      {/* Orb */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 20 }}>
        <div style={{
          width: 200, height: 200, borderRadius: 100,
          background: "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F5F5F5 8%, #D4D4D8 20%, #A1A1AA 40%, #52525B 65%, #27272A 85%, #18181B 100%)",
          boxShadow: "inset -14px -14px 30px rgba(0,0,0,0.55), 0px 24px 48px rgba(0,0,0,0.18)",
          transform: `scale(${orbScale}) translate(${orbX}px, ${orbY}px)`,
        }} />
      </AbsoluteFill>

      {/* "Secured" text */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 30 }}>
        <span style={{ fontSize: 48, fontWeight: 500, color: "#FFFFFF", opacity: securedOpacity, fontFamily: fontFamily + ", sans-serif" }}>
          Secured
        </span>
      </AbsoluteFill>

      {/* Logo / brand morph */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 30 }}>
        <span style={{ fontSize: 42, fontWeight: 600, color: "#18181B", opacity: logoOpacity, fontFamily: fontFamily + ", sans-serif" }}>
          {logoText}
        </span>
      </AbsoluteFill>

      {/* CTA URL */}
      <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, textAlign: "center", zIndex: 30, opacity: ctaOpacity, transform: `translateY(${ctaY}px)` }}>
        <span style={{ fontSize: 20, fontWeight: 400, color: "#71717A", fontFamily: fontFamily + ", sans-serif" }}>
          elevenlabs.io/speech-engine
        </span>
      </div>

      {/* Fade to white */}
      <AbsoluteFill style={{ backgroundColor: "#FFF", opacity: whiteCurtain, pointerEvents: "none", zIndex: 200 }} />
    </AbsoluteFill>
  );
};
