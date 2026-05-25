import React, { type ReactNode } from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props { children?: ReactNode; accentColor?: string; className?: string; }

export const LuxuryCard: React.FC<Props> = ({ children, accentColor, className }) => {
  const frame = useCurrentFrame();
  const borderAngle = interpolate(frame % 240, [0, 240], [0, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const c = accentColor || "var(--color-primary, #4285F4)";

  return (
    <div className={`relative rounded-[var(--radius-xl,24px)] p-8 ${className || ""}`} style={{
      background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(24px)",
      boxShadow: `0 24px 64px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
    }}>
      {/* Animated border gradient */}
      <div className="absolute inset-0 rounded-[var(--radius-xl,24px)] pointer-events-none" style={{
        padding: 1,
        background: `conic-gradient(from ${borderAngle}deg at 50% 50%, ${c}44, transparent 25%, ${c}22 50%, transparent 75%, ${c}44)`,
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
