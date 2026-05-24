import type { Blueprint } from "../engine/types";

export const iosBlueprint: Blueprint = {
  meta: { id: "ios", name: "iOS Template" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#0071E3",
        background: "#F5F5F7",
        surface: "#FFFFFF",
        foreground: "#000000",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "28px", body: "14px" },
      },
      shape: {
        radii: { md: "14px", lg: "20px" },
        shadows: { md: "0 4px 12px rgba(0,0,0,0.08)" },
      },
    },
  },
  scenes: [
    {
      id: "home",
      type: "generic",
      startFrame: 0,
      durationInFrames: 90,
      elements: [
        {
          id: "phone-home",
          type: "iphone-frame",
          props: {},
          layout: { position: "absolute", x: "50%", y: "50%" },
          animation: { type: "scale-bounce", timeline: { inFrame: 0 } },
          children: [
            { id: "status-bar", type: "ios-status-bar", props: {} },
            { id: "title", type: "text", props: { text: "Skills", fontSize: 28, fontWeight: 700, color: "#000" } },
            { id: "nav-bar", type: "ios-nav-bar", props: { tabs: ["All", "Productivity", "Developer", "Creative"], activeTab: 0 } },
          ],
        },
      ],
    },
    {
      id: "detail",
      type: "generic",
      startFrame: 70,
      durationInFrames: 110,
      elements: [
        {
          id: "phone-detail",
          type: "iphone-frame",
          props: {},
          layout: { position: "absolute", x: "60%", y: "50%" },
          animation: { type: "scale-bounce", timeline: { inFrame: 5 } },
          children: [
            { id: "status-bar-2", type: "ios-status-bar", props: {} },
          ],
        },
      ],
    },
  ],
};
