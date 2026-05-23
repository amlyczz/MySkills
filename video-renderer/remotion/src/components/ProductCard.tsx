import React from "react";
import { Img, staticFile } from "remotion";

interface Props {
  title: string;
  description: string;
  imageUrl?: string;
  accentColor?: string;
  style?: React.CSSProperties;
}

export const ProductCard: React.FC<Props> = ({
  title, description, imageUrl, accentColor = "#F4C542", style,
}) => (
  <div style={{
    width: 320, height: 420,
    background: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
    display: "flex", flexDirection: "column",
    flexShrink: 0,
    fontFamily: "Inter, sans-serif",
    ...style,
  }}>
    <div style={{
      height: 180, background: "#f0f0f0", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 48,
    }}>
      {imageUrl ? (
        <Img src={staticFile(imageUrl)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={title} />
      ) : (
        <span style={{ opacity: 0.3 }}>📦</span>
      )}
    </div>
    <div style={{ padding: 24, flex: 1 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: "#111" }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 14, color: "#666", lineHeight: 1.5 }}>{description}</p>
    </div>
    <div style={{ padding: "0 24px 24px" }}>
      <div style={{
        background: accentColor, border: "none", borderRadius: 999,
        padding: "10px 24px", fontSize: 14, fontWeight: 500,
        color: "#FFFFFF", display: "inline-block",
        cursor: "default",
      }}>
        Try it now
      </div>
    </div>
  </div>
);
