import React from "react";

interface ComparisonRow {
  label: string;
  left: string;
  right: string;
  leftWinner?: boolean;
  rightWinner?: boolean;
}

interface Props {
  leftTitle: string;
  rightTitle: string;
  rows: ComparisonRow[];
  className?: string;
}

export const ComparisonTable: React.FC<Props> = ({ leftTitle = "", rightTitle = "", rows = [], className }) => (
  <div className={`w-full max-w-3xl font-sans rounded-[var(--radius-lg,16px)] overflow-hidden ${className || ""}`}
    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
    <div className="flex border-b border-white/10">
      <div className="flex-1 px-6 py-4 font-bold text-lg text-[var(--color-foreground,#fff)] bg-white/5 text-center">{leftTitle}</div>
      <div className="flex-1 px-6 py-4 font-bold text-lg text-[var(--color-primary,#4285F4)] text-center">{rightTitle}</div>
    </div>
    {rows.map((row, i) => (
      <div key={i} className="flex border-b border-white/5 last:border-b-0">
        <div className="w-40 px-4 py-3 text-[var(--color-muted,#AAA)] text-sm font-medium border-r border-white/5">{row.label}</div>
        <div className="flex-1 px-4 py-3 text-sm text-center"
          style={{ color: row.leftWinner ? "var(--color-primary,#4285F4)" : "var(--color-foreground,#fff)", opacity: row.rightWinner ? 0.4 : 1 }}>
          {row.left}
        </div>
        <div className="flex-1 px-4 py-3 text-sm text-center border-l border-white/5"
          style={{ color: row.rightWinner ? "var(--color-primary,#4285F4)" : "var(--color-foreground,#fff)", opacity: row.leftWinner ? 0.4 : 1 }}>
          {row.right}
        </div>
      </div>
    ))}
  </div>
);
