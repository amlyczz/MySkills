import React, { type ReactNode } from "react";

/**
 * SplitLayout — Grid-based two-column layout.
 * Uses Tailwind for all structural layout; grid-template-columns is the only
 * dynamic style (ratio-driven, cannot be expressed as a static utility).
 */
export const SplitLayout: React.FC<{
  children?: ReactNode;
  leftRatio?: number; // 0-1, overrides default 4:6
}> = ({ children, leftRatio }) => {
  const childrenArray = React.Children.toArray(children);
  const left = childrenArray[0] ?? null;
  const right = childrenArray[1] ?? null;

  const leftFr = leftRatio ? leftRatio * 10 : 4;
  const rightFr = leftRatio ? (1 - leftRatio) * 10 : 6;

  return (
    <div
      className="w-full h-full grid items-center gap-16 px-[120px] py-[96px]"
      style={{ gridTemplateColumns: `${leftFr}fr ${rightFr}fr` }}
    >
      <div className="w-full h-full flex flex-col justify-center">{left}</div>
      <div className="w-full h-full flex items-center justify-center">{right}</div>
    </div>
  );
};
