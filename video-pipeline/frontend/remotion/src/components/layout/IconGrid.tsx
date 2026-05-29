import React from "react";

interface IconItem {
  icon: string;
  label: string;
  subtitle?: string;
  color?: string;
}

interface Props {
  items: IconItem[];
  columns?: number;
  className?: string;
}

export const IconGrid: React.FC<Props> = ({
  items = [],
  columns = 4,
  className,
}) => (
  <div
    className={`grid gap-6 font-sans ${className || ""}`}
    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
  >
    {items.map((item, i) => (
      <div
        key={i}
        className="flex flex-col items-center text-center bg-[var(--color-surface,#FFF)] rounded-[var(--radius-lg,20px)] px-6 py-8 shadow-[var(--shadow-sm,0_2px_8px_rgba(0,0,0,0.05))]"
      >
        <div
          className="text-4xl mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: item.color || "var(--color-surface,#f0f0f0)" }}
        >
          {item.icon}
        </div>
        <div className="font-semibold text-[var(--color-foreground,#111)] text-lg">
          {item.label}
        </div>
        {item.subtitle && (
          <div className="text-[var(--color-muted,#888)] text-sm mt-1">
            {item.subtitle}
          </div>
        )}
      </div>
    ))}
  </div>
);
