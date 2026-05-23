import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export interface CardData {
  title: string; slogan: string; features: string[];
  price: string; accentColor: string;
}

interface Props { data: CardData; index: number; style?: React.CSSProperties; }

export const PricingCard: React.FC<Props> = ({ data, index, style }) => {
  const frame = useCurrentFrame();
  const enterProgress = interpolate(frame - index * 15, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const floatOffset = Math.sin((frame + index * 20) * 0.03) * 10;

  return (
    <div style={{
      ...style,
      transform: `translateY(${floatOffset}px)`,
      opacity: enterProgress,
      filter: `blur(${interpolate(enterProgress, [0, 1], [8, 0])}px)`,
    }}>
      <div style={{
        width: 380, height: 520, borderRadius: 32,
        background: "#050505",
        border: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden", position: "relative",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Visual area */}
        <div style={{ height: "55%", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <div style={{
              position: "absolute", top: "20%", left: "20%",
              width: 200, height: 200, background: data.accentColor,
              borderRadius: "50%", filter: "blur(60px)", opacity: 0.5,
            }} />
            <div style={{
              position: "absolute", bottom: "10%", right: "10%",
              width: 150, height: 150, background: "#FFF",
              borderRadius: "50%", filter: "blur(50px)", opacity: 0.3,
            }} />
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `radial-gradient(${data.accentColor} 1px, transparent 1px)`,
              backgroundSize: "20px 20px", opacity: 0.2,
            }} />
          </div>
          <div style={{ position: "absolute", top: 30, left: 30, zIndex: 1 }}>
            <h2 style={{
              margin: 0, fontSize: 42, fontWeight: 700, color: "#FFF",
              fontFamily: "Inter, sans-serif", letterSpacing: "-1px",
            }}>
              {data.title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: "30px", flex: 1,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          background: "linear-gradient(to bottom, rgba(20,20,20,0), #050505 20%)",
        }}>
          <p style={{ margin: "0 0 20px", color: "#AAA", fontSize: 16, lineHeight: 1.5, fontFamily: "Inter, sans-serif" }}>
            {data.slogan}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 30px" }}>
            {data.features.map((feat, i) => (
              <li key={i} style={{
                color: "#888", fontSize: 14, marginBottom: 8,
                fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center",
              }}>
                <span style={{ color: data.accentColor, marginRight: 8 }}>&bull;</span>{feat}
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#FFF", fontSize: 32, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>{data.price}</div>
            <div style={{
              background: "#FFF", color: "#000", borderRadius: 20,
              padding: "10px 20px", fontSize: 14, fontWeight: 600,
              fontFamily: "Inter, sans-serif",
            }}>Get started &rarr;</div>
          </div>
        </div>

        {/* Shimmer */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.1) 55%, transparent 60%)",
          pointerEvents: "none", zIndex: 5,
          animation: "shimmer 4s infinite linear",
        }} />
      </div>
    </div>
  );
};
