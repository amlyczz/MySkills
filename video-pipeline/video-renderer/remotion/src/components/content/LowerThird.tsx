import React from "react";

interface Props {
  name: string;
  subtitle?: string;
  position?: "bottom-left" | "bottom-right";
  showBar?: boolean;
  barColor?: string;
  className?: string;
}

export const LowerThird: React.FC<Props> = ({
  name,
  subtitle,
  position = "bottom-left",
  showBar = true,
  barColor,
  className,
}) => {
  const posClass =
    position === "bottom-left"
      ? "bottom-16 left-20 items-start"
      : "bottom-16 right-20 items-end";

  return (
    <div className={`absolute ${posClass} flex gap-5 font-sans z-50 ${className || ""}`}>
      {showBar && (
        <div
          className="w-1.5 rounded-full self-stretch shrink-0"
          style={{ background: barColor || "var(--color-primary, #4285F4)" }}
        />
      )}
      <div className="flex flex-col" style={{ whiteSpace: "nowrap" }}>
        <div
          className="text-[var(--color-foreground,#fff)] font-bold"
          style={{ fontSize: 36, lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
        >
          {name}
        </div>
        {subtitle && (
          <div
            className="text-[var(--color-muted,#CCC)] font-medium mt-1"
            style={{ fontSize: 20, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
