import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { SceneCanvas } from "./components/decoration/SceneCanvas";
import { PopUpBookBase } from "./components/layout/PopUpBookBase";
import { LayeredElement } from "./components/layout/LayeredElement";
import { TextBlock } from "./components/content/TextBlock";
import { DiagonalWipeTransition } from "./components/decoration/DiagonalWipeTransition";

const SvgPlaceholder: React.FC<{ label: string; w: number; h: number; color?: string }> = ({ label, w, h, color = "#E8E8E0" }) => (
  <div style={{
    width: w, height: h,
    background: `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.8) 100%)`,
    backdropFilter: "blur(12px)",
    borderRadius: 24,
    border: "1px solid rgba(255, 255, 255, 0.6)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, fontWeight: 500, letterSpacing: "1px",
    fontFamily: "Inter, sans-serif", color: "#444",
  }}>
    {label}
  </div>
);

const Scene1_Desktop: React.FC = () => (
  <AbsoluteFill>
    <SceneCanvas themeColor="#A8E600">
      <PopUpBookBase startFrame={10}>
        <LayeredElement depth={0} delay={0} startFrame={20}>
          <div style={{ position: "absolute", left: 250, top: 200, transform: "rotate(-3deg)" }}>
            <SvgPlaceholder label="NOTEBOOK" w={460} h={280} color="#Fdfdf8" />
          </div>
        </LayeredElement>
        <LayeredElement depth={1} delay={8} startFrame={20}>
          <div style={{ position: "absolute", left: 780, top: 130, transform: "rotate(6deg)" }}>
            <SvgPlaceholder label="PLANT" w={180} h={240} color="#e8f8e8" />
          </div>
        </LayeredElement>
        <LayeredElement depth={2} delay={16} startFrame={20}>
          <div style={{ position: "absolute", left: 700, top: 400, transform: "rotate(-5deg)" }}>
            <SvgPlaceholder label="COFFEE" w={140} h={140} color="#F8Ece4" />
          </div>
        </LayeredElement>
      </PopUpBookBase>

      <TextBlock en="Curiosity is Life" jp="好奇心を人生に" color="#FF3399" x={200} y={80} startFrame={50} />
      <TextBlock en="KOKUYO" color="#A8E600" x={80} y={40} startFrame={30} />
    </SceneCanvas>
    <DiagonalWipeTransition startFrame={120} color="#FF3399" />
  </AbsoluteFill>
);

const Scene2_Creative: React.FC = () => (
  <AbsoluteFill>
    <SceneCanvas themeColor="#FF3399">
      <PopUpBookBase startFrame={10}>
        <LayeredElement depth={0} delay={0} startFrame={20}>
          <div style={{ position: "absolute", left: 350, top: 180, transform: "rotate(2deg)" }}>
            <SvgPlaceholder label="SKETCHBOOK" w={600} h={360} color="#Fcf4f4" />
          </div>
        </LayeredElement>
        <LayeredElement depth={2} delay={12} startFrame={20}>
          <div style={{ position: "absolute", left: 240, top: 160, transform: "rotate(-12deg)" }}>
            <SvgPlaceholder label="PENCIL" w={60} h={320} color="#Fcf0cc" />
          </div>
        </LayeredElement>
      </PopUpBookBase>

      <TextBlock en="Creative Work" jp="創造的な仕事" color="#00A3FF" x={240} y={70} startFrame={45} />
    </SceneCanvas>
    <DiagonalWipeTransition startFrame={120} color="#00A3FF" />
  </AbsoluteFill>
);

export const KokuyoShowcase: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={155}>
      <Scene1_Desktop />
    </Sequence>
    <Sequence from={135} durationInFrames={155}>
      <Scene2_Creative />
    </Sequence>
  </>
);
