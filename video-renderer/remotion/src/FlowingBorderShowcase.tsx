import React from "react";
import { Sequence } from "remotion";
import { FlowingBorderButton } from "./components/FlowingBorderButton";

export const FlowingBorderShowcase: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={180}>
      <FlowingBorderButton
        text="Elements" subText="PORTFOLIO"
        gradientColors={["#FF0000", "#00FF00", "#0000FF", "#FF00FF", "#FFFF00"]}
        speed={4}
      />
    </Sequence>
    <Sequence from={180} durationInFrames={180}>
      <FlowingBorderButton
        text="Projects"
        gradientColors={["#667EEA", "#764BA2", "#F093FB"]}
        speed={3}
        shadowOpacity={0.2}
      />
    </Sequence>
    <Sequence from={360} durationInFrames={180}>
      <FlowingBorderButton
        text="Contact"
        gradientColors={["#FF9A9E", "#FAD0C4", "#FFD1FF"]}
        width={280} speed={5}
        subText="GET IN TOUCH"
      />
    </Sequence>
  </>
);
