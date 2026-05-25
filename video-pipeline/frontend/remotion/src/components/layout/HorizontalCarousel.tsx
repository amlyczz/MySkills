import React from "react";
import { ProductCard } from "../content/ProductCard";

interface CardData {
  title: string;
  description: string;
  imageUrl?: string;
  accentColor?: string;
}

interface Props {
  cards: CardData[];
}

export const HorizontalCarousel: React.FC<Props> = ({ cards }) => {
  if (!cards || cards.length === 0) return null;
  return (
    <div className="absolute bottom-20 left-0 right-0 flex justify-center overflow-hidden">
      <div className="flex gap-6">
        {cards.map((card, i) => (
          <ProductCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
};
