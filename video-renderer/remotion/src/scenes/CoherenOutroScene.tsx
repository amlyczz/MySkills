import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const CoherenOutroScene: React.FC<{ title: string; subtitle?: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations start from 0 relative to the Sequence it is placed in
  const textScaleFade = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 100 } });
  const scale = interpolate(textScaleFade, [0, 1], [0.9, 1]);

  const logoFade = spring({ frame: frame - 40, fps, config: { damping: 12, stiffness: 120 } });
  const logoY = interpolate(logoFade, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0f1a", justifyContent: "center", alignItems: "center" }}>
      {/* Background */}
      <AbsoluteFill style={{
        background: "radial-gradient(circle at center, #0066ff, #0f0f1a)",
        opacity: 0.6,
        filter: "blur(40px)"
      }} />

      <h1 style={{
        position: "absolute",
        left: 960,
        top: 480,
        fontSize: "80px",
        fontWeight: 600,
        color: "#fff",
        opacity: textScaleFade,
        transform: `scale(${scale}) translateX(-50%) translateY(-50%)`,
        margin: 0
      }}>
        {title}
      </h1>

      <div style={{
        position: "absolute",
        left: 960,
        top: 600,
        opacity: logoFade,
        transform: `translateY(${logoY}px) translateX(-50%) translateY(-50%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        color: "#000",
        padding: "8px 24px",
        borderRadius: 24,
        fontWeight: "bold"
      }}>
        Cohere
      </div>
    </AbsoluteFill>
  );
};
