import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Scene1_Intro } from "./scenes/Scene1_Intro";
import { Scene2_Demo } from "./scenes/Scene2_Demo";
import { Scene3_Pipeline } from "./scenes/Scene3_Pipeline";
import { Scene4_Capabilities } from "./scenes/Scene4_Capabilities";
import { Scene5_Outro } from "./scenes/Scene5_Outro";
import { FluidAurora } from "./backgrounds/FluidAurora";
import { LightBeam } from "./backgrounds/LightBeam";

const S1 = 168;
const S2 = 194;
const S3 = 324;
const S4 = 264;
const S5 = 240;

export const TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5; // 1190

export const ElevenLabsPromo: React.FC = () => {
  let cursor = 0;
  const s1 = cursor; cursor += S1;
  const s2 = cursor; cursor += S2;
  const s3 = cursor; cursor += S3;
  const s4 = cursor; cursor += S4;
  const s5 = cursor;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* ── Layer 1: Fluid Aurora background (behind scenes) ── */}
      <AbsoluteFill style={{ zIndex: 0, mixBlendMode: "overlay", opacity: 0.45 }}>
        <FluidAurora intensity={1.2} />
      </AbsoluteFill>

      {/* ── Layer 2: Scene content ── */}
      <AbsoluteFill style={{ zIndex: 1 }}>
        <Sequence from={s1} durationInFrames={S1}>
          <Scene1_Intro />
        </Sequence>
        <Sequence from={s2} durationInFrames={S2}>
          <Scene2_Demo />
        </Sequence>
        <Sequence from={s3} durationInFrames={S3}>
          <Scene3_Pipeline />
        </Sequence>
        <Sequence from={s4} durationInFrames={S4}>
          <Scene4_Capabilities />
        </Sequence>
        <Sequence from={s5} durationInFrames={S5}>
          <Scene5_Outro />
        </Sequence>
      </AbsoluteFill>

      {/* ── Layer 3: Light beams (above scenes, below UI) ── */}
      <AbsoluteFill style={{ zIndex: 5 }}>
        <LightBeam />
      </AbsoluteFill>

      {/* ── Layer 4: Film grain (topmost) ── */}
      <AbsoluteFill style={{ zIndex: 10, mixBlendMode: "overlay", opacity: 0.04, pointerEvents: "none" }}>
        <div style={{ width: "100%", height: "100%", background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`, backgroundSize: "256px 256px" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
