import React from "react";

interface Props { tabs: string[]; activeTab?: number; }

export const IOSNavBar: React.FC<Props> = ({ tabs, activeTab = 0 }) => (
  <div style={{
    display: "flex", gap: 8, padding: "8px 16px", overflowX: "hidden",
  }}>
    {tabs.map((tab, i) => (
      <div key={i} style={{
        padding: "8px 16px", borderRadius: 999,
        background: i === activeTab ? "#F2F2F7" : "transparent",
        fontSize: 14, fontWeight: 500, color: "#000",
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        {tab}
      </div>
    ))}
  </div>
);
