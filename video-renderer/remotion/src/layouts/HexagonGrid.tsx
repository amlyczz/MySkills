import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const HexItem: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <div style={{
    width: size, height: size * 1.15, backgroundColor: color,
    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
    display: "inline-block", margin: "-8px -2px",
    opacity: 0.9,
  }} />
);

const HEX_COLORS = ["#4285F4", "#EA4335", "#FBBC05", "#34A853", "#202120", "#5F6368", "#A855F7", "#EC4899"];

export const HexagonGridScene: React.FC = () => {
  const frame = useCurrentFrame();
  const globalScale = interpolate(frame, [0, 120], [1, 1.12], { extrapolateRight: "clamp" });
  const overlayOpacity = interpolate(frame, [20, 50], [0, 0.75], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden", fontFamily: "Inter, 'Google Sans', sans-serif" }}>
      {/* Hexagon grid */}
      <div style={{
        width: "130%", height: "130%", position: "absolute", top: "-15%", left: "-15%",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        transform: `scale(${globalScale})`,
      }}>
        {[...Array(4)].map((_, row) => (
          <div key={row} style={{
            display: "flex",
            transform: row % 2 === 0 ? "translateX(0)" : "translateX(150px)",
            marginTop: "-60px",
          }}>
            {[...Array(10)].map((_, col) => (
              <HexItem key={col} size={300} color={HEX_COLORS[(row * 10 + col) % HEX_COLORS.length]} />
            ))}
          </div>
        ))}
      </div>

      {/* Dark vignette overlay */}
      <AbsoluteFill style={{
        background: "radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)",
        opacity: overlayOpacity,
      }} />

      {/* Center UI */}
      <AbsoluteFill style={{
        justifyContent: "center", alignItems: "center",
        opacity: textOpacity,
      }}>
        <h1 style={{ fontSize: 96, color: "#FFF", margin: "0 0 24px 0", letterSpacing: "-0.02em", fontWeight: 700 }}>
          Google Flow
        </h1>
        <p style={{ fontSize: 32, color: "#E8EAED", margin: "0 0 48px 0", fontWeight: 400 }}>
          Bring your stories to life with our AI creative studio.
        </p>
        <div style={{
          backgroundColor: "#FFF", color: "#000", padding: "20px 48px",
          borderRadius: 999, fontSize: 24, fontWeight: 500,
        }}>
          Try it now
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
