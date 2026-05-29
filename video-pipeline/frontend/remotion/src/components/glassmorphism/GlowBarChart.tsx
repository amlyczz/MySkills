import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface BarItem {
  label: string;
  percentage: number;
  baselinePercentage?: number;
  barColor?: string;
  glowColor?: string;
}

interface Props {
  bars: BarItem[];
  delay?: number;
  barDuration?: number;
  barGap?: number;
  barHeight?: number;
  labelWidth?: number;
  fontSize?: number;
}

export const GlowBarChart: React.FC<Props> = ({
  bars = [],
  delay = 0,
  barDuration = 35,
  barGap = 8,
  barHeight = 40,
  labelWidth = 280,
  fontSize = 22,
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: barGap, width: "100%" }}>
      {bars.map((bar, i) => {
        const barDelay = delay + i * barGap;
        const elapsed = Math.max(0, frame - barDelay);

        // Width growth with ease-out
        const barWidth = interpolate(elapsed, [0, barDuration], [0, bar.percentage], {
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });

        // Number counter
        const displayNum = Math.floor(
          interpolate(elapsed, [0, barDuration], [0, bar.percentage], {
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          })
        );

        const color = bar.barColor || "#E63946";
        const glow = bar.glowColor || `${color}55`;

        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Label */}
            <div style={{
              width: labelWidth,
              fontSize,
              color: "rgba(255,255,255,0.7)",
              fontFamily: "'Inter', sans-serif",
              textAlign: "right",
              fontWeight: 500,
              flexShrink: 0,
            }}>
              {bar.label}
            </div>

            {/* Bar track */}
            <div style={{ flex: 1, position: "relative", height: barHeight }}>
              {/* Background track */}
              <div style={{
                position: "absolute",
                left: 0, top: 0, bottom: 0,
                width: "100%",
                borderRadius: barHeight / 2,
                background: "rgba(255,255,255,0.06)",
              }} />

              {/* Baseline (if comparison) */}
              {bar.baselinePercentage !== undefined && (
                <div style={{
                  position: "absolute",
                  left: 0, top: 4, bottom: 4,
                  width: `${bar.baselinePercentage}%`,
                  borderRadius: barHeight / 2,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }} />
              )}

              {/* Animated fill bar */}
              <div style={{
                position: "absolute",
                left: 0, top: 2, bottom: 2,
                width: `${barWidth}%`,
                borderRadius: barHeight / 2,
                background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                boxShadow: `0 0 20px ${glow}, 0 0 40px ${glow}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 16,
              }}>
                {barWidth > 15 && (
                  <span style={{
                    fontSize: fontSize - 2,
                    fontWeight: 700,
                    color: "#fff",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {displayNum}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
