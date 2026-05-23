import React from "react";

export const ExperimentCardLight: React.FC<{
  title: string; description: string; imageColor: string; accentColor?: string;
}> = ({ title, description, imageColor, accentColor }) => (
  <div style={{
    width: 400, height: 520,
    backgroundColor: "#FFFFFF", borderRadius: 24,
    boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
    display: "flex", flexDirection: "column", overflow: "hidden",
    fontFamily: "Inter, 'Google Sans', 'Helvetica Neue', sans-serif",
    flexShrink: 0,
  }}>
    <div style={{ height: "60%", backgroundColor: imageColor, margin: 12, borderRadius: 16 }} />
    <div style={{ padding: "0 24px 24px 24px", display: "flex", flexDirection: "column", flex: 1 }}>
      <h2 style={{ fontSize: 28, color: "#202120", margin: "12px 0", fontWeight: 700 }}>{title}</h2>
      <p style={{ fontSize: 16, color: "#5F6368", lineHeight: 1.5, margin: 0, flex: 1 }}>{description}</p>
      <div style={{
        fontWeight: 700, color: accentColor || "#4285F4", marginTop: "auto",
        fontSize: 16,
      }}>
        Learn more &rarr;
      </div>
    </div>
  </div>
);
