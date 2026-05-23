import React from "react";

interface Props {
  title: string; channel: string; views: string; time: string;
  thumbnailColor?: string;
}

export const VideoCard: React.FC<Props> = ({ title, channel, views, time, thumbnailColor = "#E5E7EB" }) => (
  <div style={{
    display: "flex", gap: 16, marginBottom: 16,
    fontFamily: "Inter, sans-serif",
  }}>
    <div style={{
      width: 160, height: 90, borderRadius: 12, flexShrink: 0,
      background: thumbnailColor,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 28, color: "#9CA3AF",
    }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 500, lineHeight: 1.4, color: "#0F0F0F" }}>{title}</h4>
      <p style={{ margin: 0, fontSize: 13, color: "#606060" }}>{channel} &bull; {views} views &bull; {time}</p>
    </div>
  </div>
);
