import React from "react";
import { useTypewriter } from "../../hooks/useTypewriter";

type Preset = "fadeUp" | "scale" | "typewriter";

interface Props {
  text: string;
  preset?: Preset;
  delayFrames?: number;
  triggerFrame?: number;
  className?: string;
  highlightWord?: string;
  staggerChildren?: boolean;
}

export const AnimatedText: React.FC<Props> = ({
  text,
  preset = "fadeUp",
  delayFrames = 0,
  triggerFrame = 0,
  className,
  highlightWord,
}) => {
  const adjustedDelay = delayFrames + triggerFrame;

  if (preset === "typewriter") {
    return <TypewriterText text={text} delayFrames={adjustedDelay} className={className} />;
  }

  const parts = highlightWord ? text.split(highlightWord) : [text];

  return (
    <div className={className}>
      {parts.length === 1 ? (
        text
      ) : (
        <>
          {parts[0]}
          <span className="text-[#007AFF]">{highlightWord}</span>
          {parts[1]}
        </>
      )}
    </div>
  );
};

const TypewriterText: React.FC<{
  text: string;
  delayFrames: number;
  className?: string;
}> = ({ text, delayFrames, className }) => {
  const { displayText, cursorVisible, isTyping } = useTypewriter(text, delayFrames);
  return (
    <span className={className}>
      {displayText}
      {cursorVisible && isTyping && "|"}
    </span>
  );
};
