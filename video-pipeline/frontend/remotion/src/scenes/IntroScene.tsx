import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { FluidBackground } from "../components/decoration/FluidBackground";
import { cohereColors, cohereTypography } from "../theme/tokens";

interface Props {
  /** Brand/product title */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Show 3-dot logo mark above the title (default false) */
  showDotLogo?: boolean;
  /** Background intensity for FluidBackground */
  bgIntensity?: number;
}

/**
 * IntroScene — Brand exposure scene.
 *   Center-aligned, supports Logo + title.
 *   Used for opening (S1) and closing (S10).
 */
export const IntroScene: React.FC<Props> = ({
  title = "Untitled",
  subtitle = "",
  showDotLogo = false,
  bgIntensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = interpolate(frame, [0, 90], [0.95, 1.03], { extrapolateRight: "clamp" });
  const fadeIn = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  const titleSpring = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const titleScale = interpolate(titleSpring, [0, 1], [0.97, 1]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      <FluidBackground intensity={bgIntensity} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: fadeIn,
            transform: `scale(${scale})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {showDotLogo && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 8,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: cohereColors.dot,
                    gridColumn: i === 2 ? "span 2" : undefined,
                    justifySelf: i === 2 ? "center" : undefined,
                  }}
                />
              ))}
            </div>
          )}
          <h1
            style={{
              fontFamily: cohereTypography.heading.fontFamily,
              fontSize: showDotLogo ? 120 : 96,
              fontWeight: cohereTypography.heading.weights.medium,
              color: cohereColors.textPrimary,
              letterSpacing: cohereTypography.heading.letterSpacing,
              lineHeight: cohereTypography.heading.lineHeight,
              opacity: titleOpacity,
              transform: `scale(${titleScale})`,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontFamily: cohereTypography.body.fontFamily,
                fontSize: 32,
                fontWeight: cohereTypography.body.weights.regular,
                color: cohereColors.textSecondary,
                lineHeight: cohereTypography.body.lineHeight,
                margin: 0,
                opacity: interpolate(titleSpring, [0.3, 1], [0, 1], { extrapolateRight: "clamp" }),
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
