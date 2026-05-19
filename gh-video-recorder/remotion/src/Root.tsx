import React from "react";
import { Composition } from "remotion";
import { Intro, IntroProps } from "./Intro";
import { Outro, OutroProps } from "./Outro";
import { KenBurnsClip, KenBurnsClipProps } from "./KenBurnsClip";

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

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultIntroProps}
      />
      <Composition
        id="Outro"
        component={Outro}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultOutroProps}
      />
      <Composition
        id="KenBurnsClip"
        component={KenBurnsClip}
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
    </>
  );
};
