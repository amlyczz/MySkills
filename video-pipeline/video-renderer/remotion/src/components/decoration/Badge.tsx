import React from "react";

interface Props {
  text: string;
  color?: string;
  variant?: "solid" | "outline";
  size?: "sm" | "md";
  className?: string;
}

const sizeMap = { sm: "text-xs px-2.5 py-0.5", md: "text-sm px-3 py-1" };

export const Badge: React.FC<Props> = ({
  text,
  color,
  variant = "solid",
  size = "sm",
  className,
}) => {
  const c = color || "var(--color-primary, #4285F4)";
  return (
    <span
      className={`inline-flex items-center font-sans font-semibold tracking-wide uppercase rounded-[var(--radius-md,6px)] select-none ${sizeMap[size]} ${className || ""}`}
      style={
        variant === "solid"
          ? { background: c, color: "#fff" }
          : { border: `1.5px solid ${c}`, color: c, background: "transparent" }
      }
    >
      {text}
    </span>
  );
};
