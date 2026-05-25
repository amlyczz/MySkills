import React from "react";
import { AbsoluteFill } from "remotion";
import { FluidBackground } from "../components/decoration/FluidBackground";
import { AnimatedText } from "../components/content/AnimatedText";
import { DecorationOverlay, type DecorationType } from "../components/decoration/DecorationOverlay";
import { cohereColors, cohereTypography } from "../theme/tokens";

interface TextLine {
  text: string;
  highlight?: string;
  /** Animation preset (defaults to "fadeUp") */
  preset?: "fadeUp" | "scale" | "typewriter";
  /** Relative to the preset delay schedule, extra offset in frames */
  extraDelay?: number;
}

interface Props {
  /** Array of text lines to display, each with optional highlight word */
  lines: TextLine[];
  /** Optional vector decoration layer type */
  decoration?: DecorationType;
  /** Background intensity for FluidBackground */
  bgIntensity?: number;
  /** Heading style for primary (first) line */
  headingStyle?: React.CSSProperties;
  /** Body style for secondary lines */
  bodyStyle?: React.CSSProperties;
}

/**
 * CenteredStatementScene — Core value proposition scene.
 *   Full-screen centered large text with optional vector decoration.
 *   Lines animate in sequentially with stagger.
 */
export const CenteredStatementScene: React.FC<Props> = ({
  lines,
  decoration,
  bgIntensity = 1,
  headingStyle,
  bodyStyle,
}) => {
  const headingFont: React.CSSProperties = {
    fontFamily: cohereTypography.heading.fontFamily,
    fontSize: 64,
    fontWeight: cohereTypography.heading.weights.semibold,
    color: cohereColors.textPrimary,
    letterSpacing: cohereTypography.heading.letterSpacing,
    lineHeight: cohereTypography.heading.lineHeight,
    ...headingStyle,
  };

  const bodyFont: React.CSSProperties = {
    fontFamily: cohereTypography.body.fontFamily,
    fontSize: 32,
    fontWeight: cohereTypography.body.weights.regular,
    color: "#333",
    lineHeight: cohereTypography.body.lineHeight,
    ...bodyStyle,
  };

  return (
    <AbsoluteFill>
      <FluidBackground intensity={bgIntensity} />
      {decoration && <DecorationOverlay type={decoration} />}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {lines.map((line, i) => {
          const isHeading = i === 0;
          const defaultDelay = 5 + i * 15;
          const delay = defaultDelay + (line.extraDelay || 0);
          const isSub = i > 0 && !isHeading;

          return (
            <AnimatedText
              key={i}
              text={line.text}
              preset={line.preset || "fadeUp"}
              delayFrames={delay}
              highlightWord={line.highlight}
              style={{
                ...(isSub ? bodyFont : headingFont),
                ...(i > 0 ? { marginTop: isSub ? 16 : 8 } : {}),
              }}
            />
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
