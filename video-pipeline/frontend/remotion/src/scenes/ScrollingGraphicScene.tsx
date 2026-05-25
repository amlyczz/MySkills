import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { FluidBackground } from "../components/decoration/FluidBackground";
import { AnimatedText } from "../components/content/AnimatedText";
import { MockUICard } from "../components/content/MockUICard";
import { cohereColors, cohereTypography, layout } from "../theme/tokens";

interface GridItem {
  label: string;
  icon: string;
}

interface Props {
  /** Headline text displayed above the grid */
  headline: string;
  /** Items to display */
  items: GridItem[];
  /** Layout mode: 'grid' (card grid) or 'scroll' (continuous scroll) */
  layoutMode?: "grid" | "scroll";
  /** Number of columns in grid mode */
  columns?: number;
  /** Background intensity */
  bgIntensity?: number;
}

/**
 * ScrollingGraphicScene — Grid or continuous-scroll display.
 *   Grid mode: card grid with staggered spring entrance.
 *   Scroll mode: bottom wireframe assets scrolling (reserved for future).
 */
export const ScrollingGraphicScene: React.FC<Props> = ({
  headline,
  items,
  layoutMode = "grid",
  columns = 3,
  bgIntensity = 0.05,
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
    marginBottom: 32,
    zIndex: 1,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: cohereColors.surfaceBgAlt,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
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

      {layoutMode === "grid" ? (
        <>
          <AnimatedText
            text={headline}
            preset="fadeUp"
            delayFrames={5}
            style={headingFont}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: 16,
              zIndex: 1,
            }}
          >
            {items.map((item, i) => {
              const s = spring({
                frame: Math.max(0, frame - i * layout.staggerFast),
                fps,
                config: { damping: 14, stiffness: 100 },
              });
              return (
                <MockUICard
                  key={i}
                  elevation={1}
                  style={{
                    opacity: s,
                    transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                    width: 280,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 500,
                        color: cohereColors.textPrimary,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                </MockUICard>
              );
            })}
          </div>
        </>
      ) : (
        // Scroll mode — reserved for future scrolling wireframe/GPU list scenes
        <div style={{ color: cohereColors.textSecondary }}>
          Scroll mode — reserved for future use
        </div>
      )}
    </AbsoluteFill>
  );
};
