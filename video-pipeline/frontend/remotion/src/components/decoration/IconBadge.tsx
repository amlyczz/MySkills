import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  /** Predefined variants or pass custom SVG path via children */
  variant?: "shield" | "star" | "bolt" | "check";
  color?: string;
  size?: number;
  delay?: number;
  /** Custom SVG content */
  children?: ReactNode;
}

import { type ReactNode } from "react";

const variantPaths: Record<string, string> = {
  shield: "M40 4L10 20V48C10 68 40 92 40 92C40 92 70 68 70 48V20L40 4Z",
  star: "M40 4L48 30H76L54 46L62 72L40 56L18 72L26 46L4 30H32Z",
  bolt: "M44 4L16 52H36L28 96L64 40H44Z",
  check: "M16 48L32 64L64 24",
};

const variantFills: Record<string, string> = {
  shield: "M40 28L30 48H50L40 28Z",
  star: "",
  bolt: "",
  check: "",
};

export const IconBadge: React.FC<Props> = ({
  variant = "shield",
  color = "#4A7BF7",
  size = 80,
  delay = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delay);
  const opacity = interpolate(elapsed, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  if (children) {
    return <div style={{ opacity }}>{children}</div>;
  }

  const pathD = variantPaths[variant] ?? variantPaths.shield;
  const fillD = variantFills[variant] ?? "";
  const viewBoxSize = 80;

  return (
    <div style={{ opacity }}>
      <svg width={size} height={Math.round(size * 1.2)} viewBox={`0 0 ${viewBoxSize} ${Math.round(viewBoxSize * 1.2)}`} fill="none">
        <path d={pathD} stroke={color} strokeWidth="2" fill="none" />
        {fillD && <path d={fillD} fill={color} opacity="0.3" />}
        {variant === "shield" && (
          <>
            <circle cx="40" cy="55" r="8" stroke={color} strokeWidth="1.5" fill="none" />
            <line x1="40" y1="60" x2="40" y2="72" stroke={color} strokeWidth="1.5" />
          </>
        )}
      </svg>
    </div>
  );
};
