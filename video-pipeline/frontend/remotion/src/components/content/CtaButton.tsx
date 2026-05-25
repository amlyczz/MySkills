import React from "react";

interface Props {
  label: string;
  href?: string;
  variant?: "filled" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = { sm: "text-sm px-5 py-2", md: "text-base px-7 py-3", lg: "text-lg px-9 py-4" };
const variantStyle: Record<string, string> = {
  filled:
    "bg-[var(--color-primary,#4285F4)] text-[var(--color-surface,#fff)] border-none",
  outline:
    "bg-transparent text-[var(--color-foreground,#fff)] border border-[var(--color-foreground,currentColor)] opacity-80",
  ghost:
    "bg-transparent text-[var(--color-foreground,#fff)] border-none opacity-60",
};

export const CtaButton: React.FC<Props> = ({
  label,
  variant = "filled",
  size = "md",
  className,
}) => (
  <div
    className={`inline-flex items-center justify-center rounded-[var(--radius-xl,999px)] font-sans font-semibold cursor-default tracking-wide select-none ${sizeMap[size]} ${variantStyle[variant]} ${className || ""}`}
    style={variant === "filled" ? { boxShadow: "var(--shadow-md, 0 4px 16px rgba(0,0,0,0.3))" } : undefined}
  >
    {label}
  </div>
);
