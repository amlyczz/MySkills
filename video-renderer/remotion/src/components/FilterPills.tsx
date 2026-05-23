import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface Props {
  items: string[];
  activeIndex?: number;
  startFrame?: number;
}

export const FilterPills: React.FC<Props> = ({ items, activeIndex = 0, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{
      display: "flex", gap: 10, justifyContent: "center", alignItems: "center",
      fontFamily: "Inter, 'Google Sans', sans-serif",
    }}>
      {items.map((item, i) => {
        const delay = startFrame + i * 5;
        const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 15, stiffness: 120 } });
        const active = i === activeIndex;
        return (
          <div key={i} style={{
            padding: "10px 20px", borderRadius: 999,
            background: active ? "#202120" : "transparent",
            color: active ? "#FFF" : "#202120",
            border: active ? "none" : "1px solid #DADCE0",
            fontSize: 15, fontWeight: 500, cursor: "default",
            opacity: interpolate(s, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(s, [0, 1], [8, 0])}px)`,
          }}>
            {item}
          </div>
        );
      })}
    </div>
  );
};
