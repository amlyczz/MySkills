import React from "react";
import { Composition } from "remotion";
import { Scene1_Intro } from "./scenes/Scene1_Intro";
import { Scene2_Demo } from "./scenes/Scene2_Demo";
import { Scene3_Pipeline } from "./scenes/Scene3_Pipeline";
import { Scene4_Capabilities } from "./scenes/Scene4_Capabilities";
import { Scene5_Outro } from "./scenes/Scene5_Outro";
import { ElevenLabsPromo, TOTAL_FRAMES } from "./ElevenLabsPromo";
import { FluidShowcase } from "./backgrounds/FluidShowcase";
import { SwissShowcase } from "./SwissShowcase";
import { DarkNeonShowcase } from "./DarkNeonShowcase";
import { PlayfulShowcase } from "./PlayfulShowcase";
import { ProductDemoShowcase } from "./ProductDemoShowcase";
import { KokuyoShowcase } from "./KokuyoShowcase";
import { SaasLaunchShowcase } from "./SaasLaunchShowcase";
import { IosShowcase } from "./IosShowcase";
import { PricingShowcase } from "./PricingShowcase";
import { TechLaunchShowcase } from "./TechLaunchShowcase";
import { FlowingBorderShowcase } from "./FlowingBorderShowcase";
import { ModernSaasShowcase } from "./ModernSaasShowcase";
import { QuadSplitShowcase } from "./QuadSplitShowcase";
import { MemphisShowcase } from "./MemphisShowcase";
import { SpotifyShowcase } from "./SpotifyShowcase";
import { MetaphorShowcase } from "./MetaphorShowcase";
import { HealthAppShowcase } from "./HealthAppShowcase";
import { FastlaneShowcase } from "./FastlaneShowcase";

const FPS = 24;
const WIDTH = 1920;
const HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="S01-Title-Concept"
        component={Scene1_Intro}
        durationInFrames={168}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="S02-Live-Demo"
        component={Scene2_Demo}
        durationInFrames={194}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="S03-Pipeline-Architecture"
        component={Scene3_Pipeline}
        durationInFrames={324}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="S04-Capabilities"
        component={Scene4_Capabilities}
        durationInFrames={264}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="S05-Security-Outro"
        component={Scene5_Outro}
        durationInFrames={240}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="ElevenLabs-Promo"
        component={ElevenLabsPromo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Fluid-Showcase"
        component={FluidShowcase}
        durationInFrames={720}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Swiss-Showcase"
        component={SwissShowcase}
        durationInFrames={540}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="DarkNeon-Showcase"
        component={DarkNeonShowcase}
        durationInFrames={500}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Playful-Showcase"
        component={PlayfulShowcase}
        durationInFrames={375}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="ProductDemo-Showcase"
        component={ProductDemoShowcase}
        durationInFrames={305}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Kokuyo-Showcase"
        component={KokuyoShowcase}
        durationInFrames={290}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="SaasLaunch-Showcase"
        component={SaasLaunchShowcase}
        durationInFrames={240}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="iOS-Showcase"
        component={IosShowcase}
        durationInFrames={180}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Pricing-Showcase"
        component={PricingShowcase}
        durationInFrames={150}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="TechLaunch-Showcase"
        component={TechLaunchShowcase}
        durationInFrames={240}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="FlowingBorder-Showcase"
        component={FlowingBorderShowcase}
        durationInFrames={540}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="ModernSaas-Showcase"
        component={ModernSaasShowcase}
        durationInFrames={300}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="QuadSplit-Showcase"
        component={QuadSplitShowcase}
        durationInFrames={270}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition id="Memphis-Showcase" component={MemphisShowcase} durationInFrames={270} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Spotify-Showcase" component={SpotifyShowcase} durationInFrames={360} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Metaphor-Showcase" component={MetaphorShowcase} durationInFrames={260} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="HealthApp-Showcase" component={HealthAppShowcase} durationInFrames={180} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Fastlane-Showcase" component={FastlaneShowcase} durationInFrames={260} fps={FPS} width={WIDTH} height={HEIGHT} />
    </>
  );
};
