import React from "react";

interface Props {
  icon: string; title: string; subtitle?: string;
  iconBg?: string; style?: React.CSSProperties;
}

export const IOSListItem: React.FC<Props> = ({ icon, title, subtitle, iconBg = "#F2F2F7", style }) => (
  <div style={{
    display: "flex", alignItems: "center", padding: "12px 16px",
    background: "#FFFFFF", borderBottom: "1px solid #F0F0F0",
    ...style,
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8, background: iconBg,
      display: "flex", alignItems: "center", justifyContent: "center",
      marginRight: 12, fontSize: 16,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: "#86868B", marginTop: 2 }}>{subtitle}</div>}
    </div>
    <span style={{ color: "#C7C7CC", fontSize: 14 }}>›</span>
  </div>
);
