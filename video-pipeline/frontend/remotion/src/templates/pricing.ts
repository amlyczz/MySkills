import type { Blueprint } from "../engine/types";

export const pricingBlueprint: Blueprint = {
  meta: { id: "pricing", name: "Pricing Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#4ADE80",
        background: "#F4F4F5",
        surface: "#050505",
        foreground: "#FFFFFF",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "42px", body: "14px" },
      },
      shape: {
        radii: { lg: "32px" },
        shadows: { lg: "0 20px 50px rgba(0,0,0,0.5)" },
      },
    },
  },
  scenes: [
    {
      id: "pricing-scene",
      type: "generic",
      startFrame: 0,
      durationInFrames: 150,
      style: { background: "#F4F4F5" },
      elements: [
        {
          id: "stack",
          type: "pricing-stack",
          children: [
            {
              id: "card-spark",
              type: "pricing-card",
              props: {
                title: "Spark",
                slogan: "Add confidence and edge to timid writing.",
                features: ["'Surprise me' button", "Instant list of angles", "Idea generator"],
                price: "$14/mo",
                accentColor: "#4ADE80",
              },
              animation: { type: "fade-up", timeline: { inFrame: 0 } },
            },
            {
              id: "card-bold",
              type: "pricing-card",
              props: {
                title: "Bold",
                slogan: "Make your writing more persuasive and high-impact.",
                features: ["Rewrite complex sentences", "Highlight jargon", "One-click summaries"],
                price: "$14/mo",
                accentColor: "#FACC15",
              },
              animation: { type: "fade-up", timeline: { inFrame: 10 } },
            },
            {
              id: "card-pro",
              type: "pricing-card",
              props: {
                title: "Pro",
                slogan: "Full toolkit for professional writers and content teams.",
                features: ["Unlimited rewrites", "Team collaboration", "API access", "Priority support"],
                price: "$29/mo",
                accentColor: "#60A5FA",
              },
              animation: { type: "fade-up", timeline: { inFrame: 20 } },
            },
          ],
        },
      ],
    },
  ],
};
