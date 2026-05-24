import React from "react";
import { fitText } from "@remotion/layout-utils";

interface Props {
  en: string;
  jp?: string;
  color?: string;
  className?: string;
  maxWidth?: number;
}

export const TextBlock: React.FC<Props> = ({
  en,
  jp,
  color = "var(--color-primary, #FF3399)",
  className = "",
  maxWidth = 800,
}) => {
  // Use fitText to safely scale text to avoid overflow
  const { fontSize } = fitText({
    text: en,
    fontFamily: "Inter",
    fontWeight: "bold",
    withinWidth: maxWidth - 32, // account for padding
  });

  return (
    <div className={`flex flex-col items-start ${className}`} style={{ maxWidth }}>
      <div
        className="text-black px-4 py-2 font-extrabold leading-tight tracking-tight rounded-sm inline-block"
        style={{
          backgroundColor: color,
          fontSize: Math.min(fontSize, 48), // Cap size at 48
        }}
      >
        {en}
      </div>
      {jp && (
        <div className="bg-white text-black px-3 py-1 mt-1 text-base font-medium rounded-sm inline-block">
          {jp}
        </div>
      )}
    </div>
  );
};
