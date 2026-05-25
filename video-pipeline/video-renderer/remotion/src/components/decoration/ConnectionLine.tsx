import React from "react";

interface Props {
  /** SVG path data */
  d: string;
  /** Stroke color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  className?: string;
}

export const ConnectionLine: React.FC<Props> = ({
  d,
  color = "#D4D4D8",
  strokeWidth = 1.5,
  className,
}) => {
  return (
    <svg
      className={`absolute inset-0 pointer-events-none overflow-visible w-full h-full ${className || ""}`}
      viewBox="0 0 1920 1080"
    >
      <path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};
