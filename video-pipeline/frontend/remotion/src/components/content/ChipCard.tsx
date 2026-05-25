import React, { type ReactNode } from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface Props {
  color: string;
  label: string;
  sublabel?: string;
  /** Custom icon/content area. If omitted, shows a default chip rectangle. */
  children?: ReactNode;
  delay?: number;
  width?: number;
  height?: number;
  borderRadius?: number;
}

const DefaultIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="60" height="38" viewBox="0 0 60 38" fill="none" style={{ marginBottom: 8 }}>
    <rect x="4" y="4" width="52" height="30" rx="3" stroke={color} strokeWidth="1.5" fill="none" opacity="0.6" />
    <rect x="10" y="10" width="16" height="18" rx="2" stroke={color} strokeWidth="1" fill="none" opacity="0.4" />
    <rect x="30" y="10" width="16" height="18" rx="2" stroke={color} strokeWidth="1" fill="none" opacity="0.4" />
  </svg>
);

export const ChipCard: React.FC<Props> = ({
  color,
  label,
  sublabel,
  children,
  delay = 0,
  width = 220,
  height = 140,
  borderRadius = 16,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delay);

  const scaleAnim = interpolate(elapsed, [0, 15, 30], [0.8, 1.1, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(elapsed, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  const rgbMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  const rgb = rgbMatch
    ? `${parseInt(rgbMatch[1], 16)},${parseInt(rgbMatch[2], 16)},${parseInt(rgbMatch[3], 16)}`
    : "255,255,255";

  return (
    <div style={{
      width, height, borderRadius,
      border: `1.5px solid ${color}`,
      background: `rgba(${rgb},0.08)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity, transform: `scale(${scaleAnim})`,
    }}>
      {children ?? <DefaultIcon color={color} />}
      <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.6)", fontFamily: "'Inter', sans-serif" }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
};
