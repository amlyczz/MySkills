import { IntroScene } from "./IntroScene";
import { CenteredStatementScene } from "./CenteredStatementScene";
import { SplitDataChartScene } from "./SplitDataChartScene";
import { SplitUIMockupScene } from "./SplitUIMockupScene";
import { ScrollingGraphicScene } from "./ScrollingGraphicScene";
import { CoherenOutroScene } from "./CoherenOutroScene";

export const sceneRegistry = {
  IntroScene,
  CenteredStatementScene,
  SplitDataChartScene,
  SplitUIMockupScene,
  ScrollingGraphicScene,
  CoherenOutroScene,
} as const;

export type SceneType = keyof typeof sceneRegistry;

export {
  IntroScene,
  CenteredStatementScene,
  SplitDataChartScene,
  SplitUIMockupScene,
  ScrollingGraphicScene,
  CoherenOutroScene,
};
