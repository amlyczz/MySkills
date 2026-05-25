import type { Blueprint } from "../engine/types";

export const techLaunchBlueprint: Blueprint = {
  meta: { id: "tech-launch", name: "Tech Launch Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#4285F4",
        background: "#000000",
        surface: "#1A1A1A",
        foreground: "#FFFFFF",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "64px", body: "18px" },
      },
      shape: {
        radii: { md: "12px", lg: "16px" },
        shadows: { lg: "0 20px 50px rgba(0,0,0,0.5)" },
      },
    },
  },
  globalBackground: { type: "aurora-bg" },
  scenes: [
    {
      id: "scene-1-build",
      type: "generic",
      startFrame: 0,
      durationInFrames: 130,
      elements: [
        {
          id: "headline-1",
          type: "text",
          props: { text: "Build anything", fontSize: 64, fontWeight: 800, color: "#FFF", textAlign: "center" as const },
          layout: { position: "absolute", x: "50%", y: "40%", zIndex: 2 },
          animation: { type: "fade-up", timeline: { inFrame: 0 } },
        },
        {
          id: "floating-card-1",
          type: "floating-card",
          props: { rotX: 10, rotY: -10, glow: true, style: { width: 500, height: 320, background: "#1A1A1A" } },
          layout: { position: "absolute", x: "50%", y: "65%", width: 500, height: 320, zIndex: 1 },
          animation: { type: "fade-up", timeline: { inFrame: 20 } },
        },
      ],
    },
    {
      id: "scene-2-break",
      type: "generic",
      startFrame: 110,
      durationInFrames: 130,
      elements: [
        {
          id: "headline-2",
          type: "text",
          props: { text: "Break the ceiling", fontSize: 64, fontWeight: 800, color: "#FFF", textAlign: "center" as const },
          layout: { position: "absolute", x: "50%", y: "35%", zIndex: 2 },
          animation: { type: "fade-up", timeline: { inFrame: 0 } },
        },
      ],
    },
  ],
};
