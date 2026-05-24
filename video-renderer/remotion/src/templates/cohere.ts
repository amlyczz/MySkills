import type { Blueprint } from "../engine/types";

export const cohereBlueprint: Blueprint = {
  meta: { id: "cohere", name: "Cohere Command A+ Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#0066ff",
        background: "#0f0f1a",
        surface: "#1a1a2e",
        foreground: "#FFFFFF",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "64px", h2: "32px", body: "16px" },
      },
      shape: {
        radii: { lg: "16px", xl: "24px" },
        shadows: { lg: "0 20px 50px rgba(0,0,0,0.5)" },
      },
    },
  },
  globalBackground: { type: "dark-neon" },
  scenes: [
    {
      id: "intro",
      type: "intro",
      startFrame: 0,
      durationInFrames: 120,
    },
    {
      id: "statement",
      type: "centered-statement",
      startFrame: 100,
      durationInFrames: 150,
    },
    {
      id: "chart",
      type: "split-data-chart",
      startFrame: 230,
      durationInFrames: 180,
    },
    {
      id: "mockup",
      type: "split-ui-mockup",
      startFrame: 390,
      durationInFrames: 180,
    },
    {
      id: "outro",
      type: "outro",
      startFrame: 550,
      durationInFrames: 130,
    },
  ],
};
