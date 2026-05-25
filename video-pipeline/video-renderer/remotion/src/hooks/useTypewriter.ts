import { useCurrentFrame } from "remotion";

export const useTypewriter = (
  text: string,
  startFrame: number,
  charsPerFrame: number = 2,
): { displayText: string; isTyping: boolean; cursorVisible: boolean } => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const visibleChars = Math.min(text.length, Math.floor(elapsed / charsPerFrame));
  return {
    displayText: text.slice(0, visibleChars),
    isTyping: visibleChars < text.length,
    cursorVisible: Math.sin(frame * 0.25) > 0,
  };
};
