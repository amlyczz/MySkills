import React, { type ReactNode, Children } from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface Props { children?: ReactNode; delayPerChild?: number; initialDelay?: number; className?: string; }

export const StaggerReveal: React.FC<Props> = ({
  children, delayPerChild = 8, initialDelay = 0, className,
}) => {
  const frame = useCurrentFrame();

  return (
    <div className={className}>
      {Children.map(children, (child, i) => {
        const childFrame = frame - initialDelay - i * delayPerChild;
        const opacity = interpolate(childFrame, [0, 12], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        const y = interpolate(childFrame, [0, 20], [20, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

        return (
          <div style={{ opacity, transform: `translateY(${y}px)` }}>
            {child}
          </div>
        );
      })}
    </div>
  );
};
