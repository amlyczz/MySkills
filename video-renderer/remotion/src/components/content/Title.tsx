import React from "react";
import { fitText } from "@remotion/layout-utils";

type Level = "h1" | "h2" | "h3";

interface Props {
  text: string;
  level?: Level;
  subtitle?: string;
  align?: "left" | "center" | "right";
  maxWidth?: number;
  className?: string;
}

const scaleMap: Record<Level, number> = { h1: 80, h2: 48, h3: 32 };
const levelClass: Record<Level, string> = {
  h1: "font-extrabold tracking-tight",
  h2: "font-bold tracking-tight",
  h3: "font-semibold",
};

export const Title: React.FC<Props> = ({
  text,
  level = "h1",
  subtitle,
  align = "center",
  maxWidth = 1000,
  className,
}) => {
  const { fontSize } = fitText({
    text,
    fontFamily: "Inter",
    fontWeight: level === "h1" ? 800 : level === "h2" ? 700 : 600,
    withinWidth: maxWidth - 64,
  });

  const capped = Math.min(fontSize, scaleMap[level]);

  return (
    <div
      className={`flex flex-col items-${align === "center" ? "center" : align === "left" ? "start" : "end"} px-8 font-sans ${className || ""}`}
      style={{ maxWidth }}
    >
      <div
        className={`text-[var(--color-foreground,#fff)] ${levelClass[level]}`}
        style={{ fontSize: capped, lineHeight: 1.15 }}
      >
        {text}
      </div>
      {subtitle && (
        <div
          className="text-[var(--color-muted,#AAA)] mt-3 font-normal"
          style={{ fontSize: capped * 0.35 }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
