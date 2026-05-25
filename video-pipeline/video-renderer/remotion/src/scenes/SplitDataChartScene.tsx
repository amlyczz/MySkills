import React from "react";
import { AbsoluteFill } from "remotion";
import { FluidBackground } from "../components/decoration/FluidBackground";
import { AnimatedText } from "../components/content/AnimatedText";
import { DataBarChart } from "../components/content/DataBarChart";
import { SplitLayout } from "../components/layout/SplitLayout";
import { cohereColors, cohereTypography } from "../theme/tokens";

interface BarData {
  label: string;
  value: number;
  compareValue?: number;
}

interface Props {
  /** Left-side headline text (1-2 lines) */
  leftLines: Array<{ text: string; style?: React.CSSProperties }>;
  /** Chart data for right side */
  chartData: BarData[];
  /** Show comparison bars + labels */
  showComparison?: boolean;
  /** Whether to use highlight gradient styling on bars */
  isHighlight?: boolean;
  /** Stagger delay between bars */
  chartStaggerDelay?: number;
  /** Max value for chart (auto-computed if omitted) */
  maxValue?: number;
  /** Background intensity */
  bgIntensity?: number;
}

/**
 * SplitDataChartScene — Data comparison scene.
 *   4:6 split layout. Left: text. Right: animated bar charts.
 */
export const SplitDataChartScene: React.FC<Props> = ({
  leftLines,
  chartData,
  showComparison = false,
  isHighlight = false,
  chartStaggerDelay = 10,
  maxValue,
  bgIntensity = 0.06,
}) => {
  const headingFont: React.CSSProperties = {
    fontFamily: cohereTypography.heading.fontFamily,
    fontSize: 64,
    fontWeight: cohereTypography.heading.weights.semibold,
    color: cohereColors.textPrimary,
    letterSpacing: cohereTypography.heading.letterSpacing,
    lineHeight: cohereTypography.heading.lineHeight,
  };

  const bodyFont: React.CSSProperties = {
    fontFamily: cohereTypography.body.fontFamily,
    fontSize: 32,
    fontWeight: cohereTypography.body.weights.regular,
    color: "#333",
    lineHeight: cohereTypography.body.lineHeight,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: cohereColors.surfaceBg }}>
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
            {leftLines.map((line, i) => (
              <AnimatedText
                key={i}
                text={line.text}
                preset="fadeUp"
                delayFrames={5 + i * 10}
                style={{
                  ...(i === 0 ? headingFont : bodyFont),
                  ...(i > 0 ? { marginTop: 8 } : {}),
                  ...line.style,
                }}
              />
            ))}
          </div>
        }
        right={
          <div style={{ width: "100%" }}>
            <DataBarChart
              data={chartData}
              showComparison={showComparison}
              isHighlight={isHighlight}
              staggerDelay={chartStaggerDelay}
              maxValue={maxValue}
            />
          </div>
        }
      />
    </AbsoluteFill>
  );
};
