import type { Blueprint } from "../engine/types";

export const metaphorBlueprint: Blueprint = {
  meta: { id: "metaphor", name: "Metaphor Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#E6502A",
        background: "#EAE6DE",
        surface: "#FFFFFF",
        foreground: "#111111",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "48px", body: "18px" },
      },
      shape: {
        radii: { lg: "16px" },
        shadows: { md: "0 4px 12px rgba(0,0,0,0.08)" },
      },
    },
  },
  scenes: [
    {
      id: "scene-1-sun",
      type: "generic",
      startFrame: 0,
      durationInFrames: 130,
      style: { background: "#EAE6DE" },
      elements: [
        {
          id: "text-1",
          type: "text",
          props: {
            text: "The mind thrives in clarity.",
            fontSize: 48,
            fontWeight: 700,
            color: "#111",
          },
          layout: { position: "absolute", x: 80, y: 250, zIndex: 2 },
          animation: { type: "fade-up", timeline: { inFrame: 0 } },
        },
      ],
    },
    {
      id: "scene-2-plant",
      type: "generic",
      startFrame: 110,
      durationInFrames: 130,
      style: { background: "#EAE6DE" },
      elements: [
        {
          id: "text-2",
          type: "text",
          props: {
            text: "Ideas grow when nurtured.",
            fontSize: 48,
            fontWeight: 700,
            color: "#111",
          },
          layout: { position: "absolute", x: 80, y: 250, zIndex: 2 },
          animation: { type: "fade-up", timeline: { inFrame: 0 } },
        },
      ],
    },
  ],
};
