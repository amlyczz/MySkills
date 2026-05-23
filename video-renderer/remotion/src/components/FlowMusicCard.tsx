import React from "react";

export const FlowMusicCard: React.FC = () => (
  <div style={{
    width: 400, height: 520, backgroundColor: "#161618", borderRadius: 24,
    boxShadow: "0 24px 48px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column",
    position: "relative", overflow: "hidden",
    fontFamily: "Inter, 'Google Sans', sans-serif", flexShrink: 0,
  }}>
    <div style={{ padding: "24px 24px 0 24px", display: "flex", gap: 12 }}>
      <div style={{ backgroundColor: "#2D2D2D", color: "#B3B3B3", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500 }}>Producer AI</div>
      <div style={{ color: "#808080", padding: "6px 0", fontSize: 12 }}>Google Flow Music</div>
    </div>
    <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{
        width: 96, height: 96, backgroundColor: "#FFF", borderRadius: "50%",
        display: "flex", justifyContent: "center", alignItems: "center",
        boxShadow: "0 0 40px rgba(255,255,255,0.1)", paddingLeft: 8,
      }}>
        <div style={{ width: 0, height: 0, borderTop: "16px solid transparent", borderBottom: "16px solid transparent", borderLeft: "26px solid #000" }} />
      </div>
    </div>
    <div style={{ padding: "0 24px 32px 24px", zIndex: 2 }}>
      <h2 style={{ fontSize: 32, color: "#FFF", margin: "0 0 16px 0", letterSpacing: "-0.03em" }}>Google Flow Music</h2>
      <div style={{ backgroundColor: "#FFF", color: "#000", display: "inline-block", padding: "12px 24px", borderRadius: 999, fontWeight: 600, fontSize: 16 }}>Try it now</div>
    </div>
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
      background: "linear-gradient(180deg, rgba(22,22,24,0) 0%, rgba(22,22,24,0.2) 20%, rgba(66,133,244,0.4) 60%, rgba(244,143,177,0.8) 100%)",
      filter: "blur(10px)", zIndex: 1, pointerEvents: "none",
    }} />
  </div>
);
