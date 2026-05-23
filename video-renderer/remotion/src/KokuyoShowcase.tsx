import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { SceneCanvas } from "./components/SceneCanvas";
import { PopUpBookBase } from "./components/PopUpBookBase";
import { LayeredElement } from "./components/LayeredElement";
import { TextBlock } from "./components/TextBlock";
import { DiagonalWipeTransition } from "./components/DiagonalWipeTransition";

const SvgPlaceholder: React.FC<{ label: string; w: number; h: number; color?: string }> = ({ label, w, h, color = "#E8E8E0" }) => (
  <div style={{
    width: w, height: h, background: color, borderRadius: 8,
    border: "2px solid #000", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 14, fontWeight: 600,
    fontFamily: "Inter, sans-serif", color: "#333",
  }}>
    {label}
  </div>
);

const Scene1_Desktop: React.FC = () => (
  <AbsoluteFill>
    <SceneCanvas themeColor="#A8E600">
      <PopUpBookBase startFrame={10}>
        <LayeredElement depth={0} delay={0} startFrame={20}>
          <div style={{ position: "absolute", left: 100, top: 80 }}>
            <SvgPlaceholder label="NOTEBOOK" w={400} h={200} color="#F0F0E8" />
          </div>
        </LayeredElement>
        <LayeredElement depth={1} delay={8} startFrame={20}>
          <div style={{ position: "absolute", left: 700, top: 40 }}>
            <SvgPlaceholder label="PLANT" w={120} h={160} color="#D4F5D4" />
          </div>
        </LayeredElement>
        <LayeredElement depth={2} delay={16} startFrame={20}>
          <div style={{ position: "absolute", left: 500, top: 120 }}>
            <SvgPlaceholder label="COFFEE" w={100} h={100} color="#E8D4C8" />
          </div>
        </LayeredElement>
      </PopUpBookBase>

      <TextBlock en="Curiosity is Life" jp="好奇心を人生に" color="#FF3399" x={150} y={60} startFrame={50} />
      <TextBlock en="KOKUYO" color="#A8E600" x={50} y={20} startFrame={30} />
    </SceneCanvas>
    <DiagonalWipeTransition startFrame={120} color="#FF3399" />
  </AbsoluteFill>
);

const Scene2_Creative: React.FC = () => (
  <AbsoluteFill>
    <SceneCanvas themeColor="#FF3399">
      <PopUpBookBase startFrame={10}>
        <LayeredElement depth={0} delay={0} startFrame={20}>
          <div style={{ position: "absolute", left: 300, top: 60 }}>
            <SvgPlaceholder label="SKETCHBOOK" w={500} h={220} color="#FFF0F0" />
          </div>
        </LayeredElement>
        <LayeredElement depth={2} delay={12} startFrame={20}>
          <div style={{ position: "absolute", left: 150, top: 140 }}>
            <SvgPlaceholder label="PENCIL" w={60} h={180} color="#FFE8B0" />
          </div>
        </LayeredElement>
      </PopUpBookBase>

      <TextBlock en="Creative Work" jp="創造的な仕事" color="#00A3FF" x={180} y={50} startFrame={45} />
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
