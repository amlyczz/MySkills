import React from "react";

interface Props {
  icon: string; title: string; description: string; author: string;
  style?: React.CSSProperties;
}

export const AgentCard: React.FC<Props> = ({ icon, title, description, author, style }) => (
  <div style={{
    width: 480,
    backgroundColor: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
    borderRadius: 24, padding: 32,
    border: "1px solid rgba(255,255,255,0.4)",
    boxShadow: "0 24px 48px rgba(0,0,0,0.08)",
    fontFamily: "Inter, sans-serif",
    ...style,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#000", color: "#FFF", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 20, fontWeight: 700 }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: 24, color: "#000", fontWeight: 600 }}>{title}</h3>
    </div>
    <p style={{ margin: "0 0 24px 0", fontSize: 18, color: "#666", lineHeight: 1.5 }}>{description}</p>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
      <span style={{ color: "#666" }}>By {author}</span>
      <div style={{ display: "flex", gap: -8 }}>
        {["#E0E0E0", "#C0C0C0", "#A0A0A0"].map((c, i) => (
          <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: c, border: "2px solid #FFF" }} />
        ))}
      </div>
    </div>
  </div>
);
