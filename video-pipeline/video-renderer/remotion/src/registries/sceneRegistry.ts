import type React from "react";
import { IntroScene } from "../scenes/IntroScene";
import { CenteredStatementScene } from "../scenes/CenteredStatementScene";
import { SplitDataChartScene } from "../scenes/SplitDataChartScene";
import { SplitUIMockupScene } from "../scenes/SplitUIMockupScene";
import { ScrollingGraphicScene } from "../scenes/ScrollingGraphicScene";
import { CoherenOutroScene } from "../scenes/CoherenOutroScene";
import type { SceneType } from "../engine/types";

// NOTE: "generic" is handled by GenericScene in the engine, not registered here
export const presetSceneRegistry: Record<Exclude<SceneType, "generic">, React.FC<any>> = {
  "intro": IntroScene,
  "centered-statement": CenteredStatementScene,
  "split-data-chart": SplitDataChartScene,
  "split-ui-mockup": SplitUIMockupScene,
  "scrolling-graphic": ScrollingGraphicScene,
  "outro": CoherenOutroScene,
};
