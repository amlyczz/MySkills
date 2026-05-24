import type { Blueprint } from "../engine/types";

export const healthAppBlueprint: Blueprint = {
  meta: { id: "health-app", name: "Health App Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#2563EB",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        foreground: "#0F172A",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "48px", body: "16px" },
      },
      shape: {
        radii: { md: "8px", lg: "20px", xl: "40px" },
        shadows: { md: "0 10px 30px rgba(0,0,0,0.1)", lg: "0 20px 60px rgba(0,0,0,0.15)" },
      },
    },
  },
  scenes: [
    {
      id: "stats",
      type: "generic",
      startFrame: 0,
      durationInFrames: 90,
      style: {
        background: "#F8FAFC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      },
      elements: [
        {
          id: "counter-steps",
          type: "text",
          props: { text: "12,543", fontSize: 48, fontWeight: 700, color: "#0F172A" },
          animation: { type: "scale-bounce", timeline: { inFrame: 0 } },
        },
        {
          id: "label-steps",
          type: "text",
          props: { text: "Steps Today", fontSize: 16, color: "#64748B" },
          animation: { type: "fade-up", timeline: { inFrame: 5 } },
        },
      ],
    },
    {
      id: "activity",
      type: "generic",
      startFrame: 70,
      durationInFrames: 110,
      style: {
        background: "#F8FAFC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 20,
      },
      elements: [
        {
          id: "mood-ring",
          type: "progress-ring",
          props: {},
          animation: { type: "scale-bounce", timeline: { inFrame: 0 } },
        },
      ],
    },
  ],
};
