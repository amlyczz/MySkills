import type { Blueprint } from "../engine/types";

export const modernSaasBlueprint: Blueprint = {
  meta: { id: "modern-saas", name: "Modern SaaS Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#1D1D1F",
        background: "#F5F5F7",
        surface: "#FFFFFF",
        foreground: "#1D1D1F",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "48px", body: "14px" },
      },
      shape: {
        radii: { md: "8px", lg: "28px" },
        shadows: { md: "0 10px 40px rgba(0,0,0,0.08)" },
      },
    },
  },
  scenes: [
    {
      id: "scene-1-prompt",
      type: "generic",
      startFrame: 0,
      durationInFrames: 160,
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      },
      elements: [
        {
          id: "question-heading",
          type: "text",
          props: {
            text: "What do you want to build?",
            fontSize: 48,
            fontWeight: 700,
            color: "var(--color-foreground)",
            textAlign: "center" as const,
          },
          animation: { type: "fade-up", timeline: { inFrame: 0 } },
        },
        {
          id: "prompt",
          type: "prompt-input",
          props: {
            text: "Make an art tutor app that teaches me about one great painter daily",
            startFrame: 20,
          },
          layout: { position: "absolute", x: "50%", y: "60%", width: "80%" },
          animation: { type: "fade-up", timeline: { inFrame: 15 } },
        },
      ],
    },
    {
      id: "scene-2-cards",
      type: "generic",
      startFrame: 140,
      durationInFrames: 160,
      style: {
        background: "#F0F2F5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
      },
      elements: [
        {
          id: "card-1",
          type: "product-card",
          props: {
            title: "Art Tutor",
            color: "#FFE8CC",
          },
          animation: { type: "scale-bounce", timeline: { inFrame: 0 } },
        },
        {
          id: "card-2",
          type: "product-card",
          props: {
            title: "Bedtime Stories",
            color: "#D4E8FF",
          },
          animation: { type: "scale-bounce", timeline: { inFrame: 10 } },
        },
      ],
    },
  ],
};
