import type { Blueprint } from "../engine/types";

export const fastlaneBlueprint: Blueprint = {
  meta: { id: "fastlane", name: "Fastlane Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#DC2626",
        background: "#FFFFFF",
        surface: "#FEF3F2",
        foreground: "#1E293B",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "42px", body: "14px" },
      },
      shape: {
        radii: { md: "8px", lg: "20px" },
        shadows: { md: "0 4px 20px rgba(0,0,0,0.08)" },
      },
    },
  },
  scenes: [
    {
      id: "calendar",
      type: "generic",
      startFrame: 0,
      durationInFrames: 130,
      style: {
        background: "linear-gradient(135deg, #FEF3F2, #FFF, #FDF2F8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      elements: [
        {
          id: "headline",
          type: "text",
          props: { text: "Ship faster with AI.", fontSize: 42, fontWeight: 700, color: "#1E293B" },
          animation: { type: "fade-up", timeline: { inFrame: 10 } },
        },
      ],
    },
    {
      id: "content-calendar",
      type: "generic",
      startFrame: 110,
      durationInFrames: 150,
      style: {
        background: "linear-gradient(135deg, #FEF3F2, #FFF, #FDF2F8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      elements: [],
    },
  ],
};
