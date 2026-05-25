import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { OrganicBlob } from "../components/decoration/OrganicBlob";

const Theme = { bg: "#F5F4F0", yellow: "#FFD54F", blue: "#4285F4", pink: "#F48FB1", green: "#34A853" };

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleUp = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const subtitleUp = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 12, stiffness: 100 } });
  const blobIn = spring({ frame, fps, config: { damping: 20, mass: 2, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: Theme.bg, overflow: "hidden" }}>
      {/* Blobs sliding in from corners */}
      <div style={{ position: "absolute", top: -100, left: -100, transform: `scale(${blobIn})` }}>
        <OrganicBlob color={Theme.yellow} size={600} morphing />
      </div>
      <div style={{ position: "absolute", top: -150, right: -150, transform: `translateX(${-blobIn * 100}px) translateY(${blobIn * 100}px)` }}>
        <OrganicBlob color={Theme.blue} size={700} morphing />
      </div>
      <div style={{ position: "absolute", bottom: -100, left: -200, transform: `translateX(${blobIn * 150}px) translateY(${-blobIn * 100}px)` }}>
        <OrganicBlob color={Theme.pink} size={800} morphing />
      </div>
      <div style={{ position: "absolute", bottom: -200, right: -100, transform: `scale(${blobIn})` }}>
        <OrganicBlob color={Theme.green} size={600} morphing />
      </div>

      {/* Logo text */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 10, fontFamily: "Inter, 'Google Sans', sans-serif" }}>
        <div style={{ opacity: titleUp, transform: `translateY(${interpolate(titleUp, [0, 1], [40, 0])}px)`, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1 style={{ fontSize: 48, color: "#5F6368", fontWeight: 500, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 40 }}>🔬</span> Google Labs
          </h1>
        </div>
        <div style={{ marginTop: 16, opacity: subtitleUp, transform: `translateY(${interpolate(subtitleUp, [0, 1], [20, 0])}px)` }}>
          <p style={{ fontSize: 28, color: "#80868B", margin: 0, fontWeight: 400 }}>
            The home for AI experiments at Google
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
