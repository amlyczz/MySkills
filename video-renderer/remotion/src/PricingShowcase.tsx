import React from "react";
import { AbsoluteFill } from "remotion";
import { PricingCard, type CardData } from "./components/PricingCard";

const cards: CardData[] = [
  {
    title: "Spark",
    slogan: "Add confidence and edge to timid writing.",
    features: ["'Surprise me' button", "Instant list of angles", "Idea generator"],
    price: "$14/mo",
    accentColor: "#4ADE80",
  },
  {
    title: "Bold",
    slogan: "Make your writing more persuasive and high-impact.",
    features: ["Rewrite complex sentences", "Highlight jargon", "One-click summaries"],
    price: "$14/mo",
    accentColor: "#FACC15",
  },
  {
    title: "Pro",
    slogan: "Full toolkit for professional writers and content teams.",
    features: ["Unlimited rewrites", "Team collaboration", "API access", "Priority support"],
    price: "$29/mo",
    accentColor: "#60A5FA",
  },
];

const shimmerCSS = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export const PricingShowcase: React.FC = () => (
  <AbsoluteFill style={{ background: "#F4F4F5", overflow: "hidden" }}>
    <style>{shimmerCSS}</style>

    <div style={{
      width: "100%", height: "100%",
      display: "flex", justifyContent: "center", alignItems: "center",
      perspective: "1200px",
    }}>
      <div style={{
        display: "flex",
        transformStyle: "preserve-3d",
        transform: "rotateX(10deg) rotateY(-15deg)",
      }}>
        {cards.map((card, i) => (
          <div key={i} style={{
            transform: `translateZ(${i * 50}px) translateY(${i * 40}px)`,
            marginLeft: i === 0 ? 0 : -120,
            zIndex: cards.length - i,
          }}>
            <PricingCard data={card} index={i} />
          </div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);
