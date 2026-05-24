import React, { type ReactNode } from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  children: ReactNode;
  themeColor: string;
  className?: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/**
 * SceneCanvas — Full-size animated gradient background.
 * Micro-animation: dynamic gradient rotation and color-stop breathing.
 * Gradient uses inline style (math-driven, cannot be expressed in Tailwind).
 */
export const SceneCanvas: React.FC<Props> = ({ children, themeColor, className }) => {
  const frame = useCurrentFrame();
  const { r, g, b } = hexToRgb(themeColor);

  const angle1 = interpolate(frame % 180, [0, 180], [0, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const angle2 = (angle1 + 120) % 360;
  const stop1 = 20 + Math.sin(frame * 0.04) * 15;
  const stop2 = 50 + Math.cos(frame * 0.035) * 15;
  const stop3 = 80 + Math.sin(frame * 0.03 + 1) * 10;

  return (
    <div
      className={`w-full h-full flex items-center justify-center overflow-hidden ${className || ""}`}
      style={{
        background: `
          linear-gradient(${angle1}deg,
            rgba(${r},${g},${b},0.25) 0%,
            rgba(${r},${g},${b},0.12) ${stop1}%,
            #fdfcfb ${stop2}%,
            rgba(${r},${g},${b},0.10) ${stop3}%,
            rgba(${r},${g},${b},0.22) 100%
          ),
          linear-gradient(${angle2}deg,
            transparent 40%,
            rgba(${r},${g},${b},0.08) 60%,
            transparent 80%
          )
        `,
      }}
    >
      <div className="w-full h-full relative flex-1 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};
