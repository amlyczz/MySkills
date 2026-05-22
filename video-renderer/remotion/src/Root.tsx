import React from "react";
import { Composition } from "remotion";
import { Intro, IntroProps } from "./Intro";
import { Outro, OutroProps } from "./Outro";
import { KenBurnsClip, KenBurnsClipProps } from "./KenBurnsClip";
import { VideoComposer, VideoComposerProps } from "./VideoComposer";
import { getStructure } from "./structures";
import { VideoConfig } from "./types";

const defaultIntroProps: IntroProps = {
  title: "Example Project",
  tagline: "A powerful tool for modern development",
  points: [
    "Lightning-fast performance",
    "Easy to integrate",
    "Active community support",
    "Cross-platform compatible",
    "Open source and free",
  ],
  themeIndex: 0,
  bgType: "starfield",
};

const defaultOutroProps: OutroProps = {
  url: "https://github.com/example/project",
  stats: "10k Stars \u00b7 2k Forks",
  summary:
    "A must-have tool that simplifies complex workflows and boosts developer productivity.",
  themeIndex: 0,
  bgType: "starfield",
};

const defaultKenBurnsProps: KenBurnsClipProps = {
  imageUrl: "example.jpg",
  durationInFrames: 150,
  panFromX: 0.5,
  panFromY: 0.5,
  panToX: 0.5,
  panToY: 0.5,
  zoomFrom: 1.0,
  zoomTo: 1.3,
};

/** VideoComposer 默认配置 — 漏斗型示例 */
const defaultVideoConfig: VideoConfig = {
  structureId: "funnel",
  styleId: "dark-purple",
  bgType: "starfield",
  sceneConfigs: {
    hook: {
      layoutId: "hero-center",
      motionMap: { title: "bounce-in" },
      content: {
        headline: "Example Project",
      },
    },
    problem: {
      layoutId: "hero-center",
      motionMap: {},
      content: {
        title: "Why This Matters",
        points: [
          "Complex workflows slow teams down",
          "Existing tools lack flexibility",
          "Manual processes are error-prone",
        ],
      },
    },
    solution: {
      layoutId: "split-left-text",
      motionMap: {},
      content: {
        title: "Introducing a Better Way",
        subtitle: "A powerful tool for modern development",
      },
    },
    showcase: {
      layoutId: "media-full",
      motionMap: {},
      content: {},
    },
    features: {
      layoutId: "hero-center",
      motionMap: {},
      content: {
        title: "Key Features",
        points: [
          "Lightning-fast performance",
          "Easy to integrate",
          "Active community support",
          "Cross-platform compatible",
          "Open source and free",
        ],
      },
    },
    cta: {
      layoutId: "hero-center",
      motionMap: {},
      content: {
        title: "github.com/example/project",
        stats: "10k Stars \u00b7 2k Forks",
        summary:
          "A must-have tool that simplifies complex workflows and boosts developer productivity.",
      },
    },
  },
  audio: {
    sfxEnabled: false,
    voiceover: [],
    voiceoverEnabled: false,
  },
};

// Remotion's Composition type is strict about generic props in newer TS versions.
// Double-cast via unknown to satisfy the type checker.
const IntroComp = Intro as unknown as React.FC<Record<string, unknown>>;
const OutroComp = Outro as unknown as React.FC<Record<string, unknown>>;
const KenBurnsComp = KenBurnsClip as unknown as React.FC<Record<string, unknown>>;
const VideoComposerComp = VideoComposer as unknown as React.FC<Record<string, unknown>>;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 旧组件：向后兼容 */}
      <Composition
        id="Intro"
        component={IntroComp}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultIntroProps}
      />
      <Composition
        id="Outro"
        component={OutroComp}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultOutroProps}
      />
      <Composition
        id="KenBurnsClip"
        component={KenBurnsComp}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultKenBurnsProps}
        calculateMetadata={async ({ props }) => {
          const p = props as unknown as KenBurnsClipProps;
          return {
            durationInFrames: p.durationInFrames,
          };
        }}
      />

      <Composition
        id="VideoComposer"
        component={VideoComposerComp}
        durationInFrames={9000}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ config: defaultVideoConfig }}
        calculateMetadata={async ({ props }) => {
          const p = props as { config: VideoConfig };
          const config = p?.config;
          if (!config?.structureId) return { durationInFrames: 9000 };
          const structure = getStructure(config.structureId);
          if (!structure) return { durationInFrames: 9000 };
          // timeline-adaptive: 直接从 sceneConfigs 计算
          if (config.structureId === "timeline-adaptive") {
            let totalFrames = 0;
            for (const sc of Object.values(config.sceneConfigs ?? {})) {
              totalFrames += (sc.durationSeconds && sc.durationSeconds > 0 ? sc.durationSeconds : 10) * 30;
            }
            return { durationInFrames: Math.max(totalFrames, 30) };
          }
          let totalFrames = 0;
          for (const scene of structure.scenes) {
            const sceneCfg = config.sceneConfigs?.[scene.id];
            const dur =
              sceneCfg?.durationSeconds && sceneCfg.durationSeconds > 0
                ? sceneCfg.durationSeconds
                : scene.durationSeconds > 0
                  ? scene.durationSeconds
                  : 10;
            totalFrames += dur * 30;
          }
          return { durationInFrames: Math.max(totalFrames, 30) };
        }}
      />
    </>
  );
};
