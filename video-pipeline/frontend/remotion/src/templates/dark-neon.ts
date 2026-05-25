import type { Blueprint } from "../engine/types";

export const darkNeonBlueprint: Blueprint = {
  meta: { id: "dark-neon", name: "Dark Neon Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#00F5D4",
        background: "#070B0A",
        surface: "#0a1a16",
        foreground: "#ffffff",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "48px", body: "16px" },
      },
      shape: {
        radii: { md: "8px", lg: "16px" },
        shadows: { md: "0 4px 6px rgba(0,0,0,0.3)" },
      },
    },
  },
  globalBackground: { type: "dark-neon" },
  scenes: [
    {
      id: "dark-neon-bg",
      type: "generic",
      startFrame: 0,
      durationInFrames: 360,
      elements: [],
    },
  ],
};
