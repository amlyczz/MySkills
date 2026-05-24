import React from "react";
import { Composition } from "remotion";
import { DEFAULT_FPS, DEFAULT_WIDTH, DEFAULT_HEIGHT } from "./engine/constants";
import { TemplateRenderer } from "./engine/TemplateRenderer";
import { searchDemoBlueprint } from "./templates/search-demo";
import { darkNeonBlueprint } from "./templates/dark-neon";
import { memphisBlueprint } from "./templates/memphis";
import { iosBlueprint } from "./templates/ios";
import { spotifyBlueprint } from "./templates/spotify";
import { modernSaasBlueprint } from "./templates/modern-saas";
import { pricingBlueprint } from "./templates/pricing";
import { techLaunchBlueprint } from "./templates/tech-launch";
import { fluidBlueprint } from "./templates/fluid-showcase";
import { kokuyoBlueprint } from "./templates/kokuyo";
import { metaphorBlueprint } from "./templates/metaphor";
import { healthAppBlueprint } from "./templates/health-app";
import { fastlaneBlueprint } from "./templates/fastlane";
import { playfulBlueprint } from "./templates/playful";
import { cohereBlueprint } from "./templates/cohere";
import { calculateTotalFrames } from "./engine/types";
import { FluidShowcase } from "./backgrounds/FluidShowcase";
import { DarkNeonShowcase } from "./DarkNeonShowcase";
import { PlayfulShowcase } from "./PlayfulShowcase";
import { KokuyoShowcase } from "./KokuyoShowcase";
import { IosShowcase } from "./IosShowcase";
import { PricingShowcase } from "./PricingShowcase";
import { TechLaunchShowcase } from "./TechLaunchShowcase";
import { ModernSaasShowcase } from "./ModernSaasShowcase";
import { MemphisShowcase } from "./MemphisShowcase";
import { SpotifyShowcase } from "./SpotifyShowcase";
import { MetaphorShowcase } from "./MetaphorShowcase";
import { HealthAppShowcase } from "./HealthAppShowcase";
import { FastlaneShowcase } from "./FastlaneShowcase";
import { CohereShowcase } from "./CohereShowcase";
import { ComponentCatalog, catalogTotalFrames } from "./ComponentCatalog";
import { VideoComposer } from "./engine/VideoComposer";

const makeBlueprintComp = (bp: any) => ({
  component: TemplateRenderer,
  defaultProps: { blueprint: bp },
  durationInFrames: calculateTotalFrames(bp),
  fps: DEFAULT_FPS,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
});

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoComposer"
        component={VideoComposer}
        defaultProps={{ blueprintJson: "{}" }}
        durationInFrames={1800}
        fps={DEFAULT_FPS}
        width={DEFAULT_WIDTH}
        height={DEFAULT_HEIGHT}
        calculateMetadata={async ({ props }) => {
          try {
            const bp = JSON.parse((props as any).blueprintJson || "{}");
            const { calculateTotalFrames } = await import("./engine/types");
            const frames = calculateTotalFrames(bp);
            return { durationInFrames: Math.max(frames, 900) };
          } catch { return { durationInFrames: 1800 }; }
        }}
      />
      <Composition id="Component-Catalog" component={ComponentCatalog} durationInFrames={catalogTotalFrames()} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="AI-Search-Demo" {...makeBlueprintComp(searchDemoBlueprint)} />
      <Composition id="DarkNeon-Blueprint" {...makeBlueprintComp(darkNeonBlueprint)} />
      <Composition id="Memphis-Blueprint" {...makeBlueprintComp(memphisBlueprint)} />
      <Composition id="iOS-Blueprint" {...makeBlueprintComp(iosBlueprint)} />
      <Composition id="Spotify-Blueprint" {...makeBlueprintComp(spotifyBlueprint)} />
      <Composition id="ModernSaas-Blueprint" {...makeBlueprintComp(modernSaasBlueprint)} />
      <Composition id="Pricing-Blueprint" {...makeBlueprintComp(pricingBlueprint)} />
      <Composition id="TechLaunch-Blueprint" {...makeBlueprintComp(techLaunchBlueprint)} />
      <Composition id="Fluid-Blueprint" {...makeBlueprintComp(fluidBlueprint)} />
      <Composition id="Kokuyo-Blueprint" {...makeBlueprintComp(kokuyoBlueprint)} />
      <Composition id="Metaphor-Blueprint" {...makeBlueprintComp(metaphorBlueprint)} />
      <Composition id="HealthApp-Blueprint" {...makeBlueprintComp(healthAppBlueprint)} />
      <Composition id="Fastlane-Blueprint" {...makeBlueprintComp(fastlaneBlueprint)} />
      <Composition id="Playful-Blueprint" {...makeBlueprintComp(playfulBlueprint)} />
      <Composition id="Cohere-Blueprint" {...makeBlueprintComp(cohereBlueprint)} />

      <Composition id="Fluid-Showcase" component={FluidShowcase} durationInFrames={720} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="DarkNeon-Showcase" component={DarkNeonShowcase} durationInFrames={360} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="Playful-Showcase" component={PlayfulShowcase} durationInFrames={303} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="Kokuyo-Showcase" component={KokuyoShowcase} durationInFrames={290} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="iOS-Template" component={IosShowcase} durationInFrames={180} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="Pricing-Showcase" component={PricingShowcase} durationInFrames={150} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="TechLaunch-Showcase" component={TechLaunchShowcase} durationInFrames={240} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="ModernSaas-Showcase" component={ModernSaasShowcase} durationInFrames={300} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="Memphis-Showcase" component={MemphisShowcase} durationInFrames={270} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="Spotify-Showcase" component={SpotifyShowcase} durationInFrames={360} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="Metaphor-Showcase" component={MetaphorShowcase} durationInFrames={260} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="HealthApp-Showcase" component={HealthAppShowcase} durationInFrames={180} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="Fastlane-Showcase" component={FastlaneShowcase} durationInFrames={260} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
      <Composition id="Cohere-Showcase" component={CohereShowcase} durationInFrames={1608} fps={DEFAULT_FPS} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} />
    </>
  );
};
