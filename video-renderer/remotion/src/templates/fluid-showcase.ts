import type { Blueprint } from "../engine/types";

export const fluidBlueprint: Blueprint = {
  meta: { id: "fluid-showcase", name: "Fluid Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#4F8CF7",
        background: "#0a0a0f",
        surface: "#111118",
        foreground: "#FFFFFF",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "48px", body: "16px" },
      },
      shape: {
        radii: { md: "8px" },
        shadows: { md: "0 4px 6px rgba(0,0,0,0.3)" },
      },
    },
  },
  globalBackground: { type: "fluid-aurora", props: { intensity: 1.5 } },
  scenes: [
    {
      id: "fluid-bg",
      type: "generic",
      startFrame: 0,
      durationInFrames: 720,
      background: { type: "light-beam" },
      elements: [],
    },
  ],
};
