import type { Blueprint } from "../engine/types";

export const kokuyoBlueprint: Blueprint = {
  meta: { id: "kokuyo", name: "KOKUYO Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#A8E600",
        secondary: "#FF3399",
        background: "#FDFCFB",
        surface: "#FFFFFF",
        foreground: "#444444",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "32px", body: "18px" },
      },
      shape: {
        radii: { lg: "24px" },
        shadows: { md: "0 20px 40px rgba(0,0,0,0.08)" },
      },
    },
  },
  scenes: [
    {
      id: "scene-1-curiosity",
      type: "generic",
      startFrame: 0,
      durationInFrames: 155,
      elements: [
        {
          id: "headline-a",
          type: "text-block",
          props: { en: "KOKUYO", color: "#A8E600" },
          animation: { type: "fade-up", timeline: { inFrame: 30 } },
        },
        {
          id: "headline-b",
          type: "text-block",
          props: { en: "Curiosity is Life", jp: "好奇心を人生に", color: "#FF3399" },
          animation: { type: "fade-up", timeline: { inFrame: 50 } },
        },
      ],
    },
    {
      id: "scene-2-creative",
      type: "generic",
      startFrame: 135,
      durationInFrames: 155,
      elements: [
        {
          id: "headline-c",
          type: "text-block",
          props: { en: "Creative Work", jp: "創造的な仕事", color: "#00A3FF" },
          animation: { type: "fade-up", timeline: { inFrame: 45 } },
        },
      ],
    },
  ],
};
