import React, { type ReactNode } from "react";

type Variant = "info" | "warning" | "tip" | "danger";

interface Props {
  children?: ReactNode;
  variant?: Variant;
  title?: string;
  className?: string;
}

const variantStyles: Record<Variant, { bg: string; border: string; icon: string; text: string }> = {
  info:    { bg: "rgba(59,130,246,0.1)",  border: "#3B82F6", icon: "ℹ️", text: "#93C5FD" },
  warning: { bg: "rgba(245,158,11,0.1)",  border: "#F59E0B", icon: "⚠️", text: "#FCD34D" },
  tip:     { bg: "rgba(16,185,129,0.1)",  border: "#10B981", icon: "💡", text: "#6EE7B7" },
  danger:  { bg: "rgba(239,68,68,0.1)",   border: "#EF4444", icon: "🚨", text: "#FCA5A5" },
};

export const CalloutBox: React.FC<Props> = ({ children, variant = "info", title, className }) => {
  const s = variantStyles[variant];
  return (
    <div
      className={`rounded-[var(--radius-lg,16px)] p-6 font-sans ${className || ""}`}
      style={{ background: s.bg, borderLeft: `4px solid ${s.border}` }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{s.icon}</span>
        {title && <span className="font-bold text-lg" style={{ color: s.text }}>{title}</span>}
      </div>
      <div className="text-[var(--color-foreground,#fff)] text-base leading-relaxed opacity-90">
        {children}
      </div>
    </div>
  );
};
