import React from "react";

const themes: Record<string, { accentBg: string; accentText: string; accentBorder: string }> = {
  blue:   { accentBg: "bg-[#4ECDC4]", accentText: "text-[#4ECDC4]", accentBorder: "border-[#4ECDC4]" },
  red:    { accentBg: "bg-[#FF6B6B]", accentText: "text-[#FF6B6B]", accentBorder: "border-[#FF6B6B]" },
  yellow: { accentBg: "bg-[#FFE66D]", accentText: "text-[#FFE66D]", accentBorder: "border-[#FFE66D]" },
  purple: { accentBg: "bg-[#6C5CE7]", accentText: "text-[#6C5CE7]", accentBorder: "border-[#6C5CE7]" },
};

export const MemphisCard: React.FC<{ name: string; role: string; text: string; theme?: string; className?: string }> =
({ name, role, text, theme = "blue", className = "" }) => {
  const t = themes[theme] || themes.blue;

  return (
    <div className={`w-full max-w-sm min-h-[280px] rounded-[var(--radius-xl,32px)] p-10 relative overflow-hidden text-[var(--color-foreground,#FFF)] font-sans bg-[var(--color-surface,#0A192F)] ${className}`}>
      <div className={`absolute -top-5 -right-5 w-[150px] h-[150px] rounded-full opacity-15 ${t.accentBg}`} />
      <div className={`absolute bottom-5 left-10 w-16 h-2 rounded ${t.accentBg}`} />
      <div className={`absolute top-5 right-10 w-5 h-5 rounded-full border-[3px] ${t.accentBorder}`} />
      <div className="relative z-10">
        <h3 className="text-xl mb-2 font-semibold">What Our Customers Say</h3>
        <div className="text-[15px] leading-relaxed opacity-90">"{text}"</div>
        <div className="mt-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[var(--color-muted,#333)]" />
          <div>
            <div className="font-bold">{name}</div>
            <div className={`text-[13px] ${t.accentText}`}>{role}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
