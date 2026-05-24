import React from "react";
import { Img } from "remotion";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  src: string;
  durationFrames?: number;
  scaleFrom?: number;
  scaleTo?: number;
  panX?: number;
  panY?: number;
  className?: string;
}

export const KenBurns: React.FC<Props> = ({
  src,
  durationFrames = 300,
  scaleFrom = 1,
  scaleTo = 1.15,
  panX = 0,
  panY = 0,
  className,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame % durationFrames, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s = scaleFrom + (scaleTo - scaleFrom) * p;
  const x = panX * p;
  const y = panY * p;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className || ""}`}>
      <Img
        src={src}
        className="w-full h-full object-cover"
        style={{ transform: `scale(${s}) translate(${x}px, ${y}px)` }}
      />
    </div>
  );
};
