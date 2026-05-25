import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface BranchItem {
  label: string;
  color?: string;
}

interface Props {
  /** Left-side source node label */
  sourceLabel: string;
  sourceColor?: string;
  /** Right-side branch items */
  branches: BranchItem[];
  delay?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  branchWidth?: number;
  branchHeight?: number;
  gap?: number;
}

export const BranchFlow: React.FC<Props> = ({
  sourceLabel,
  sourceColor = "#4A7BF7",
  branches,
  delay = 0,
  sourceWidth = 100,
  sourceHeight = 180,
  branchWidth = 160,
  branchHeight = 36,
  gap = 8,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delay);
  const opacity = interpolate(elapsed, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ display: "flex", gap: 16, opacity }}>
      {/* Source node */}
      <div style={{
        width: sourceWidth, height: sourceHeight, borderRadius: 12,
        border: `1.5px solid ${sourceColor}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: sourceColor, fontSize: 14, fontWeight: 700,
        fontFamily: "'Inter', sans-serif",
      }}>
        {sourceLabel}
      </div>

      {/* Branches */}
      <div style={{ display: "flex", flexDirection: "column", gap }}>
        {branches.map((b, i) => {
          const barElapsed = Math.max(0, elapsed - i * 8);
          const barScale = interpolate(barElapsed, [0, 15], [0, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const branchColor = b.color ?? sourceColor;
          const rgbMatch = branchColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
          const rgb = rgbMatch
            ? `${parseInt(rgbMatch[1], 16)},${parseInt(rgbMatch[2], 16)},${parseInt(rgbMatch[3], 16)}`
            : "255,255,255";

          return (
            <div key={i} style={{
              width: branchWidth * barScale, height: branchHeight, borderRadius: 8,
              background: `rgba(${rgb},0.15)`,
              border: `1px solid ${branchColor}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 600, color: "#fff",
              fontFamily: "'Inter', sans-serif", opacity: barScale,
            }}>
              {b.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};
