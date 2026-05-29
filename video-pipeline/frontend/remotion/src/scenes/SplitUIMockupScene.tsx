import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { FluidBackground } from "../components/decoration/FluidBackground";
import { AnimatedText } from "../components/content/AnimatedText";
import { MockUICard } from "../components/content/MockUICard";
import { SplitLayout } from "../components/layout/SplitLayout";
import { cohereColors, cohereTypography } from "../theme/tokens";

interface CardData {
  icon: string;
  title: string;
  desc: string;
  /** Extra delay beyond the stagger schedule */
  extraDelay?: number;
}

interface Props {
  /** Left-side headline text */
  leftLines: string[];
  /** Right-side cards to display */
  cards: CardData[];
  /** Stagger delay between cards */
  cardStagger?: number;
  /** Background intensity */
  bgIntensity?: number;
}

/**
 * SplitUIMockupScene — Feature demo scene.
 *   4:6 split. Left: headline text. Right: animated UI cards stacking in.
 */
export const SplitUIMockupScene: React.FC<Props> = ({
  leftLines = [],
  cards = [],
  cardStagger = 15,
  bgIntensity = 0.06,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingFont: React.CSSProperties = {
    fontFamily: cohereTypography.heading.fontFamily,
    fontSize: 64,
    fontWeight: cohereTypography.heading.weights.semibold,
    color: cohereColors.textPrimary,
    letterSpacing: cohereTypography.heading.letterSpacing,
    lineHeight: cohereTypography.heading.lineHeight,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: cohereColors.surfaceBgAlt }}>
      <div
        style={{
          opacity: bgIntensity,
          filter: "blur(50px)",
          position: "absolute",
          inset: 0,
        }}
      >
        <FluidBackground />
      </div>
      <SplitLayout
        left={
          <div>
            {leftLines.map((text, i) => (
              <AnimatedText
                key={i}
                text={text}
                preset="fadeUp"
                delayFrames={5 + i * 10}
                style={{
                  ...headingFont,
                  ...(i > 0 ? { marginTop: 4 } : {}),
                }}
              />
            ))}
          </div>
        }
        right={
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {cards.map((c, i) => {
              const delay = 5 + i * cardStagger + (c.extraDelay || 0);
              const s = spring({
                frame: Math.max(0, frame - delay),
                fps,
                config: { mass: 1.2, damping: 12, stiffness: 120 },
              });
              return (
                <MockUICard
                  key={i}
                  type="chat"
                  elevation={2}
                  style={{
                    opacity: interpolate(s, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px) scale(${interpolate(s, [0, 1], [0.95, 1])})`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: cohereColors.textPrimary,
                        color: cohereColors.textInverse,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {c.icon}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 18 }}>{c.title}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: "#555", lineHeight: 1.5 }}>
                    {c.desc}
                  </p>
                </MockUICard>
              );
            })}
          </div>
        }
      />
    </AbsoluteFill>
  );
};
