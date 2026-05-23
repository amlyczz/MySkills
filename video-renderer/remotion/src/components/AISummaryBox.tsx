import React from "react";

interface Card { label: string; desc: string; color?: string; }

interface Props {
  title: string;
  text: string;
  cards: Card[];
  style?: React.CSSProperties;
}

function highlightText(text: string): React.ReactNode {
  return text.split("**").map((part, i) =>
    i % 2 === 0 ? part : <strong key={i}>{part}</strong>
  );
}

export const AISummaryBox: React.FC<Props> = ({ title, text, cards, style }) => (
  <div style={{
    background: "#F8F9FA", borderRadius: 16, padding: 24, marginBottom: 24,
    border: "1px solid #E5E7EB", fontFamily: "Inter, sans-serif",
    ...style,
  }}>
    <h3 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 600, color: "#0F0F0F" }}>{title}</h3>
    <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.6, color: "#333" }}>
      {highlightText(text)}
    </p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {cards.map((card, i) => (
        <div key={i} style={{
          background: "#FFFFFF", borderRadius: 12, overflow: "hidden",
          border: "1px solid #E5E7EB",
        }}>
          <div style={{
            height: 120, display: "flex", alignItems: "center", justifyContent: "center",
            background: card.color || "#F3F4F6", fontSize: 24, color: "#9CA3AF",
          }} />
          <div style={{ padding: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#0F0F0F" }}>{card.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>{card.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);
