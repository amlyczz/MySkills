import React, { type ReactNode } from "react";

/**
 * PricingStack — 3D perspective card stack.
 * Flex layout via Tailwind; 3D transforms are dynamic per-child and
 * have no Tailwind equivalent, so they remain as inline styles.
 */
export const PricingStack: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const cards = React.Children.toArray(children);

  return (
    <div className="w-full h-full flex justify-center items-center overflow-hidden" style={{ perspective: "1200px" }}>
      <div className="flex" style={{ transformStyle: "preserve-3d", transform: "rotateX(10deg) rotateY(-15deg)" }}>
        {cards.map((card, i) => (
          <div
            key={i}
            style={{
              transform: `translateZ(${i * 50}px) translateY(${i * 40}px)`,
              marginLeft: i === 0 ? 0 : -120,
              zIndex: cards.length - i,
            }}
          >
            {card}
          </div>
        ))}
      </div>
    </div>
  );
};
