import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface Props {
  query: string;
  showDropdown?: boolean;
  typingSpeed?: number;
  dropdownItems?: string[];
}

export const SearchBar: React.FC<Props> = ({
  query, showDropdown = false, typingSpeed = 2,
  dropdownItems = ["Best electric cargo bike", "Toddler hair styles", "History of Park Slope"],
}) => {
  const frame = useCurrentFrame();
  const visibleChars = Math.min(query.length, Math.floor(frame / typingSpeed));
  const cursorOn = Math.sin(frame * 0.3) > 0;

  const dropdownOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const dropdownY = interpolate(frame, [0, 15], [-10, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "relative", marginBottom: 24, fontFamily: "Inter, sans-serif" }}>
      {/* Search input */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "#F8F9FA", borderRadius: 999, padding: "12px 20px",
        border: "1px solid #E5E7EB",
      }}>
        <span style={{ fontSize: 20, opacity: 0.6 }}>&#128269;</span>
        <span style={{ flex: 1, fontSize: 16, color: "#0F0F0F" }}>
          {query.slice(0, visibleChars)}
          <span style={{ opacity: cursorOn ? 1 : 0, marginLeft: 2, fontWeight: 300 }}>|</span>
        </span>
        <div style={{
          background: "linear-gradient(135deg, #A855F7, #EC4899)",
          color: "#FFFFFF", borderRadius: 999,
          padding: "8px 16px", fontSize: 14, fontWeight: 500,
        }}>
          Ask YouTube
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 8,
          background: "#FFFFFF", borderRadius: 16,
          boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
          padding: 16, zIndex: 10,
          opacity: dropdownOpacity,
          transform: `translateY(${dropdownY}px)`,
        }}>
          {dropdownItems.map((item, i) => (
            <div key={i} style={{
              padding: "10px 0", borderBottom: i < dropdownItems.length - 1 ? "1px solid #F0F0F0" : "none",
              fontSize: 14, color: "#0F0F0F", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>&#128337; {item}</span>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#E5E7EB", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
