import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface Props {
  children: React.ReactNode[];
  cardWidth?: number;
  gap?: number;
  scrollSpeed?: number;
  startFrame?: number;
}

export const CoverflowCarousel: React.FC<Props> = ({
  children, cardWidth = 400, gap = 60, scrollSpeed = 60, startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const scrollProgress = elapsed / scrollSpeed;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", justifyContent: "center", alignItems: "center",
      perspective: "1200px",
    }}>
      <div style={{ position: "relative", width: cardWidth, height: 540, transformStyle: "preserve-3d" }}>
        {React.Children.map(children, (child, index) => {
          const offset = index - scrollProgress;
          const translateX = offset * (cardWidth + gap);
          const translateZ = Math.abs(offset) * -200;
          const rotateY = offset * -20;
          const scale = interpolate(Math.abs(offset), [0, 1, 2], [1, 0.85, 0.7], { extrapolateRight: "clamp" });
          const opacity = interpolate(Math.abs(offset), [0, 1.5, 2.5], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div key={index} style={{
              position: "absolute", top: 0, left: 0, opacity,
              transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
              transformStyle: "preserve-3d",
              transition: "none",
            }}>
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
};
