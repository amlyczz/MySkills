import type { Blueprint } from "../engine/types";

export const playfulBlueprint: Blueprint = {
  meta: { id: "playful", name: "Playful Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#4285F4",
        secondary: "#F48FB1",
        background: "#F5F4F0",
        surface: "#FFFFFF",
        foreground: "#202120",
        dark: "#202120",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "120px", h2: "48px", body: "18px" },
      },
      shape: {
        radii: { xl: "9999px" },
        shadows: { md: "0 4px 12px rgba(0,0,0,0.08)" },
      },
    },
  },
  scenes: [
    {
      id: "flash-text",
      type: "generic",
      startFrame: 72,
      durationInFrames: 120,
      style: { background: "#F5F4F0" },
      elements: [
        {
          id: "word-display",
          type: "text",
          props: {
            text: "Be the first to experiment",
            fontSize: 64,
            fontWeight: 700,
            color: "#202120",
            textAlign: "center" as const,
          },
          layout: { position: "absolute", x: "50%", y: "50%", zIndex: 10 },
          animation: { type: "fade-up", timeline: { inFrame: 0 } },
        },
      ],
    },
    {
      id: "coverflow",
      type: "generic",
      startFrame: 192,
      durationInFrames: 168,
      style: { background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center" },
      elements: [
        {
          id: "coverflow-carousel",
          type: "coverflow-carousel",
          props: { cardWidth: 400, gap: 60, scrollSpeed: 55 },
          children: [
            { id: "flow-music", type: "cover-card", props: {} },
          ],
          animation: { type: "fade-up", timeline: { inFrame: 0 } },
        },
        {
          id: "filters",
          type: "filter-pills",
          props: { items: ["All", "Create", "Develop", "Learn", "Play"], activeIndex: 0, startFrame: 40 },
          layout: { position: "absolute", x: "50%", y: "90%", zIndex: 10 },
          animation: { type: "fade-up", timeline: { inFrame: 20 } },
        },
      ],
    },
    {
      id: "cta",
      type: "generic",
      startFrame: 360,
      durationInFrames: 96,
      style: { background: "#202120", display: "flex", alignItems: "center", justifyContent: "center" },
      elements: [
        {
          id: "cta-text",
          type: "text",
          props: { text: "Start experimenting today", fontSize: 48, fontWeight: 700, color: "#FFF" },
          animation: { type: "scale-bounce", timeline: { inFrame: 10 } },
        },
      ],
    },
  ],
};
