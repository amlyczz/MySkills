import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface Props {
  device?: "macbook" | "iphone" | "browser";
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<Props> = ({ device = "browser", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Smooth floating motion
  const floatY = Math.sin(frame * 0.02) * 5;

  if (device === "iphone") {
    return (
      <div style={{ perspective: "800px", display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
        <div style={{
          position: "relative", width: 340, height: 680,
          borderRadius: 48, background: "#1a1a1a",
          border: "3px solid #333", boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 0 2px rgba(255,255,255,0.1)",
          padding: 12, transform: `translateY(${floatY}px)`, transformStyle: "preserve-3d",
        }}>
          {/* Notch */}
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 120, height: 28, background: "#111", borderRadius: "0 0 16px 16px", zIndex: 2 }} />
          {/* Screen */}
          <div style={{ width: "100%", height: "100%", borderRadius: 36, overflow: "hidden", background: "#000" }}>
            {children}
          </div>
          {/* Glossy reflection */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 48, background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)", pointerEvents: "none" }} />
        </div>
      </div>
    );
  }

  // Modern Browser Window (Glassmorphism) default for "macbook" and "browser"
  const windowSpring = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const scale = interpolate(windowSpring, [0, 1], [0.9, 1]);
  const opacity = interpolate(windowSpring, [0, 1], [0, 1]);
  const rotateX = interpolate(windowSpring, [0, 1], [5, 0]);

  return (
    <div style={{
      perspective: "1200px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
    }}>
      <div style={{
        position: "relative",
        width: "80%",
        maxWidth: 1200,
        aspectRatio: "16/9",
        background: "rgba(30, 30, 30, 0.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: 16,
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05) inset",
        display: "flex",
        flexDirection: "column",
        transform: `translateY(${floatY}px) scale(${scale}) rotateX(${rotateX}deg)`,
        opacity,
        overflow: "hidden",
      }}>
        {/* Browser Top Bar */}
        <div style={{
          height: 40,
          background: "rgba(0, 0, 0, 0.4)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
        }}>
          {/* Mac window dots */}
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f56" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f" }} />
          {/* URL bar skeleton */}
          <div style={{ flex: 1, margin: "0 24px", height: 24, background: "rgba(255,255,255,0.05)", borderRadius: 6 }} />
        </div>
        
        {/* Screen Content */}
        <div style={{ flex: 1, position: "relative", background: "#000", overflow: "hidden" }}>
          {children}
        </div>
        
        {/* Subtle Gloss overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%)",
          pointerEvents: "none",
        }} />
      </div>
    </div>
  );
};
