import type { Blueprint } from "../engine/types";

export const memphisBlueprint: Blueprint = {
  meta: { id: "memphis", name: "Memphis Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#4ECDC4",
        background: "#FFFFFF",
        surface: "#F5F5F5",
        foreground: "#111111",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "48px", body: "18px" },
      },
      shape: {
        radii: { lg: "24px", xl: "32px" },
        shadows: { sm: "0 4px 20px rgba(0,0,0,0.05)" },
      },
    },
  },
  scenes: [
    {
      id: "scene-1-input",
      type: "generic",
      startFrame: 0,
      durationInFrames: 140,
      background: { type: "dot-grid-bg" },
      elements: [
        {
          id: "question-text",
          type: "text",
          props: {
            text: "What do you want to design?",
            fontSize: 36,
            fontWeight: 700,
            color: "var(--color-foreground)",
            textAlign: "center" as const,
          },
          layout: { position: "absolute", x: "50%", y: "40%", zIndex: 1 },
          animation: { type: "fade-up", timeline: { inFrame: 10 } },
        },
        {
          id: "typing",
          type: "typing-input",
          props: {
            text: "Make an art tutor app that teaches me about one great painter daily",
            startFrame: 15,
          },
          layout: { position: "absolute", x: "50%", y: "55%", width: "80%", zIndex: 2 },
          animation: { type: "fade-up", timeline: { inFrame: 20 } },
        },
      ],
    },
    {
      id: "scene-2-cards",
      type: "generic",
      startFrame: 120,
      durationInFrames: 150,
      style: {
        background: "#0A192F",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 20,
      },
      elements: [
        {
          id: "card-1",
          type: "memphis-card",
          props: {
            name: "Sarah Chen",
            role: "Design Lead",
            text: "The AI generated my entire brand kit in seconds. The Memphis style options were spot on.",
            theme: "blue",
          },
          animation: { type: "fade-up", timeline: { inFrame: 0 } },
        },
        {
          id: "card-2",
          type: "memphis-card",
          props: {
            name: "James Park",
            role: "Product Manager",
            text: "From a text prompt to 10 unique card designs. This changed how we approach visual content.",
            theme: "red",
          },
          animation: { type: "fade-up", timeline: { inFrame: 10 } },
        },
      ],
    },
  ],
};
