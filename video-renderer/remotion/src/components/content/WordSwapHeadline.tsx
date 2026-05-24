import React from "react";
import { useCurrentFrame } from "remotion";

interface Props {
  prefix: string;
  words: string[];
  framePerWord?: number;
  className?: string;
}

export const WordSwapHeadline: React.FC<Props> = ({
  prefix,
  words,
  framePerWord = 45,
  className,
}) => {
  const frame = useCurrentFrame();
  const wordIndex = Math.floor(frame / framePerWord) % words.length;

  return (
    <div
      className={`text-6xl font-medium text-center text-[#111] font-sans tracking-[0.01em] flex flex-wrap justify-center items-baseline gap-[0.3em] ${className || ""}`}
    >
      <span>{prefix}</span>
      <span className="inline-block min-w-[400px] text-left">
        {words[wordIndex]}
      </span>
    </div>
  );
};
