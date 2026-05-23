import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { ProductCard } from "./ProductCard";

interface CardData {
  title: string;
  description: string;
  imageUrl?: string;
  accentColor?: string;
}

interface Props {
  cards: CardData[];
  scrollDuration?: number;
}

export const HorizontalCarousel: React.FC<Props> = ({ cards, scrollDuration = 120 }) => {
  const frame = useCurrentFrame();
  const scrollProgress = interpolate(frame, [0, scrollDuration], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });
  const cardWidth = 344;
  const totalWidth = cards.length * cardWidth;
  const offset = interpolate(scrollProgress, [0, 1], [300, -totalWidth + 600]);

  return (
    <div style={{
      position: "absolute", bottom: 80, left: 0, right: 0,
      display: "flex", justifyContent: "center", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", gap: 24,
        transform: `translateX(${offset}px)`,
        willChange: "transform",
      }}>
        {cards.map((card, i) => (
          <ProductCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
};
