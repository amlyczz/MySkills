import { fontFamily } from "../fonts";
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, Sequence } from "remotion";



export const Scene2_Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Orb breathing cycle 1: 0-24 up, 24-48 down
  const breathe1Up = spring({ frame: Math.min(frame, 24), fps, config: { mass: 1, damping: 20, stiffness: 150 }, durationInFrames: 24 });
  const breathe1Down = spring({ frame: Math.max(0, Math.min(frame - 24, 24)), fps, config: { mass: 1, damping: 20, stiffness: 150 }, durationInFrames: 24 });
  const breathe1Scale = 1 + 0.05 * (frame <= 24 ? breathe1Up : 1 - breathe1Down);

  // Cycle 2: 100-120 up, 120-144 down
  const breathe2Up = spring({ frame: Math.max(0, Math.min(frame - 100, 20)), fps, config: { mass: 1, damping: 18, stiffness: 130 }, durationInFrames: 20 });
  const breathe2Down = spring({ frame: Math.max(0, Math.min(frame - 120, 24)), fps, config: { mass: 1, damping: 20, stiffness: 150 }, durationInFrames: 24 });
  const breathe2Scale = 1 + 0.08 * (frame <= 120 ? Math.max(0, frame >= 100 ? breathe2Up : 0) : 1 - breathe2Down);

  const orbScale = frame < 100 ? breathe1Scale : (frame < 120 ? breathe2Up * 0.08 + 1 : 1 + 0.08 * (1 - breathe2Down));
  // Simplified: use breathe1 for 0-48, idle 48-100, breathe2 for 100-144
  const finalScale = frame < 48 ? (1 + 0.05 * (frame <= 24 ? breathe1Up : 1 - breathe1Down)) : frame < 100 ? 1 : (1 + 0.08 * (frame <= 120 ? breathe2Up : 1 - breathe2Down));

  // Glow
  const glow1 = spring({ frame: Math.min(frame, 24), fps, config: { mass: 1, damping: 22, stiffness: 160 } });
  const glowOpacity = frame < 48 ? (0.6 + 0.3 * (frame <= 24 ? glow1 : 1)) : frame < 100 ? 0.6 : (0.6 + 0.4 * (frame <= 120 ? breathe2Up : 1 - breathe2Down));
  const glowScale = frame < 48 ? (1 + 0.1 * (frame <= 24 ? glow1 : 1)) : frame < 100 ? 1 : (1 + 0.15 * (frame <= 120 ? breathe2Up : 1 - breathe2Down));

  // User subtitle: 0-12 in, 90-102 out
  const subUserIn = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const subUserOut = interpolate(frame, [90, 102], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.ease) });
  const subUserOpacity = subUserIn * subUserOut;

  // Agent subtitle: 102-114 in
  const subAgentIn = interpolate(frame, [102, 114], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const subAgentOpacity = subAgentIn;

  // Transition: fade to black 182-194
  const curtain = interpolate(frame, [182, 194], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.linear) });

  return (
    <AbsoluteFill style={{ backgroundColor: "#18181B" }}>
      {/* Grain */}
      <AbsoluteFill style={{ mixBlendMode: "multiply", opacity: 0.04, pointerEvents: "none", zIndex: 100 }}>
        <svg width="100%" height="100%">
          <filter id="grain2"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#grain2)" />
        </svg>
      </AbsoluteFill>

      {/* Orb + glow */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            position: "absolute", width: 260, height: 260, borderRadius: 130,
            background: "radial-gradient(circle, rgba(228,228,231,0.25) 0%, transparent 70%)",
            filter: "blur(20px)", opacity: glowOpacity, transform: `scale(${glowScale})`,
          }} />
          <div style={{
            width: 200, height: 200, borderRadius: 100,
            background: "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F5F5F5 8%, #D4D4D8 20%, #A1A1AA 40%, #52525B 65%, #27272A 85%, #18181B 100%)",
            boxShadow: "inset -14px -14px 30px rgba(0,0,0,0.55), 0px 24px 48px rgba(0,0,0,0.18), 0 0 60px rgba(228,228,231,0.12)",
            transform: `scale(${finalScale})`,
          }} />
        </div>
      </AbsoluteFill>

      {/* Subtitles */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 150 }}>
        <div style={{ position: "relative", textAlign: "center" }}>
          <span style={{ fontSize: 24, fontWeight: 400, color: "#A1A1AA", opacity: subUserOpacity, fontFamily: fontFamily + ", sans-serif", position: "absolute", left: "50%", translate: "-50% 0", whiteSpace: "nowrap" }}>
            I need to reschedule my delivery &mdash; can you move it to Thursday?
          </span>
          <span style={{ fontSize: 24, fontWeight: 500, color: "#FFFFFF", opacity: subAgentOpacity, fontFamily: fontFamily + ", sans-serif", position: "absolute", left: "50%", translate: "-50% 0", whiteSpace: "nowrap" }}>
            Done &mdash; I've moved it to Thursday between 2 and 4pm. You'll get a confirmation...
          </span>
        </div>
      </AbsoluteFill>

      {/* Fade curtain */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: curtain, pointerEvents: "none", zIndex: 200 }} />
    </AbsoluteFill>
  );
};
