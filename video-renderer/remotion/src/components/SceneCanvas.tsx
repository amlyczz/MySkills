import React, { type ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface Props { children: ReactNode; themeColor: string; startFrame?: number; }

export const SceneCanvas: React.FC<Props> = ({ children, themeColor, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - startFrame, [0, 20], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0, backgroundColor: themeColor,
      clipPath: `circle(${progress * 150}% at 50% 50%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      <div style={{ width: 1400, height: 800, position: "relative" }}>
        {children}
      </div>
    </div>
  );
};
