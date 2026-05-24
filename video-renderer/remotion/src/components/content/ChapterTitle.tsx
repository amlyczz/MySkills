import React from "react";

interface Props {
  chapter: number;
  title: string;
  subtitle?: string;
  className?: string;
}

export const ChapterTitle: React.FC<Props> = ({ chapter, title, subtitle, className }) => (
  <div className={`flex flex-col items-center font-sans ${className || ""}`}>
    <div className="text-[var(--color-muted,#888)] text-sm font-semibold tracking-[0.3em] uppercase mb-3">
      Chapter {String(chapter).padStart(2, "0")}
    </div>
    <div
      className="text-[var(--color-foreground,#fff)] font-extrabold tracking-tight"
      style={{ fontSize: 48, lineHeight: 1.15 }}
    >
      {title}
    </div>
    {subtitle && (
      <div className="text-[var(--color-muted,#AAA)] text-xl mt-3 font-normal">{subtitle}</div>
    )}
  </div>
);
