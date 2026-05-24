import React from "react";

interface Props {
  value: string;
  label: string;
  accentColor?: string;
  className?: string;
}

export const StatCard: React.FC<Props> = ({
  value,
  label,
  accentColor,
  className,
}) => (
  <div
    className={`flex flex-col items-center justify-center font-sans bg-[var(--color-surface,#1A1A1A)] rounded-[var(--radius-lg,16px)] px-10 py-8 shadow-[var(--shadow-md,0_4px_16px_rgba(0,0,0,0.2))] border border-white/5 min-w-[180px] ${className || ""}`}
  >
    <div
      className="font-extrabold tracking-tight"
      style={{ fontSize: 52, color: accentColor || "var(--color-primary, #4285F4)", lineHeight: 1.1 }}
    >
      {value}
    </div>
    <div
      className="text-[var(--color-muted,#AAA)] font-medium mt-2"
      style={{ fontSize: 18 }}
    >
      {label}
    </div>
  </div>
);
