import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { OrganicBlob } from "./components/OrganicBlob";
import { WordSwapHeadline } from "./components/WordSwapHeadline";
import { HorizontalCarousel } from "./components/HorizontalCarousel";

const BG_COLOR = "#F9F7F2";
const FPS = 24;

const CARDS = [
  { title: "Google Flow", description: "AI creative studio for generating images, video, and audio in one place.", accentColor: "#5B9BF5" },
  { title: "NotebookLM", description: "Your personal research assistant with audio overviews and smart notes.", accentColor: "#4EE08E" },
  { title: "AI Studio", description: "Prototype, test, and deploy custom machine learning models fast.", accentColor: "#F4C542" },
  { title: "Flow Music", description: "Generate original melodies and beats from text prompts instantly.", accentColor: "#F7B4D8" },
  { title: "Labs Playground", description: "Experiment with cutting-edge AI tools before they launch to production.", accentColor: "#E8A87C" },
];

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headlineSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { mass: 1, damping: 14, stiffness: 100 } });
  const headlineOpacity = interpolate(headlineSpring, [0, 1], [0, 1]);
  const headlineY = interpolate(headlineSpring, [0, 1], [40, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: BG_COLOR }}>
      {/* Blobs stagger in */}
      <OrganicBlob color="#F4C542" position="top-left" delay={5} />
      <OrganicBlob color="#5B9BF5" position="top-right" delay={25} />
      <OrganicBlob color="#F7B4D8" position="bottom-left" delay={45} />
      <OrganicBlob color="#4EE08E" position="bottom-right" delay={65} />

      {/* Headline */}
      <div style={{
        position: "absolute", top: 280, left: 0, right: 0,
        opacity: headlineOpacity, transform: `translateY(${headlineY}px)`,
        willChange: "transform, opacity",
      }}>
        <WordSwapHeadline
          prefix="Be the first to"
          words={["experiment", "create", "develop", "learn", "explore"]}
          framePerWord={40}
        />
      </div>
    </AbsoluteFill>
  );
};

const CarouselScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG_COLOR }}>
      {/* Faded blobs stay visible */}
      <div style={{ opacity: 0.35 }}>
        <OrganicBlob color="#F4C542" position="top-left" delay={0} />
        <OrganicBlob color="#5B9BF5" position="top-right" delay={0} />
        <OrganicBlob color="#F7B4D8" position="bottom-left" delay={0} />
        <OrganicBlob color="#4EE08E" position="bottom-right" delay={0} />
      </div>

      {/* Stationary headline */}
      <div style={{
        position: "absolute", top: 60, left: 0, right: 0,
        fontSize: 36, fontWeight: 600, color: "#111",
        textAlign: "center",
        fontFamily: "Inter, sans-serif", letterSpacing: "0.01em",
      }}>
        Explore our latest experiments
      </div>

      <HorizontalCarousel cards={CARDS} scrollDuration={220} />
    </AbsoluteFill>
  );
};

export const PlayfulShowcase: React.FC = () => {
  return (
    <>
      <Sequence from={0} durationInFrames={160}>
        <IntroScene />
      </Sequence>
      <Sequence from={145} durationInFrames={230}>
        <CarouselScene />
      </Sequence>
    </>
  );
};
