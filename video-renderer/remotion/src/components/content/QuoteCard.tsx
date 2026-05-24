import React from "react";

interface Props {
  quote: string;
  author: string;
  role?: string;
  avatarColor?: string;
  className?: string;
}

export const QuoteCard: React.FC<Props> = ({
  quote,
  author,
  role,
  avatarColor,
  className,
}) => (
  <div
    className={`max-w-lg rounded-[var(--radius-xl,24px)] p-8 bg-[var(--color-surface,#FFF)] shadow-[var(--shadow-md,0_8px_30px_rgba(0,0,0,0.06))] border border-[var(--color-border,#eee)] font-sans ${className || ""}`}
  >
    <div className="text-[var(--color-foreground,#111)] text-lg leading-relaxed italic mb-6">
      "{quote}"
    </div>
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full shrink-0"
        style={{ background: avatarColor || "var(--color-primary, #4285F4)" }}
      />
      <div>
        <div className="font-semibold text-[var(--color-foreground,#111)] text-sm">
          {author}
        </div>
        {role && (
          <div className="text-[var(--color-muted,#888)] text-xs">{role}</div>
        )}
      </div>
    </div>
  </div>
);
