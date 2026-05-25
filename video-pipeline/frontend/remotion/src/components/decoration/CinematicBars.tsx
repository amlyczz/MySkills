import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props { height?: number; color?: string; animate?: boolean; durationFrames?: number; }

export const CinematicBars: React.FC<Props> = ({ height = 80, color = "#000", animate = true, durationFrames = 30 }) => {
  const frame = useCurrentFrame();
  const h = animate ? interpolate(frame, [0, durationFrames], [0, height], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : height;

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none" style={{ height: h, background: color }} />
      <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none" style={{ height: h, background: color }} />
    </>
  );
};
