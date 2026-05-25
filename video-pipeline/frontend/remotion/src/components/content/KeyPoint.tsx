import React from "react";

interface Props {
  points: string[];
  className?: string;
}

export const KeyPoint: React.FC<Props> = ({ points, className }) => (
  <div className={`flex flex-col gap-4 font-sans ${className || ""}`}>
    {points.map((point, i) => (
      <div key={i} className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--color-primary,#4285F4)" }} />
        <div className="text-xl text-[var(--color-foreground,#fff)] font-medium leading-relaxed">{point}</div>
      </div>
    ))}
  </div>
);
