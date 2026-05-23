import React from "react";

export const IOSStatusBar: React.FC = () => (
  <div style={{
    height: 54, display: "flex", alignItems: "flex-end", justifyContent: "space-between",
    padding: "0 24px 8px", fontSize: 14, fontWeight: 600, color: "#000",
  }}>
    <span>9:41</span>
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 12 }}>􀋦</span>
      <span style={{ fontSize: 12 }}>􀊨</span>
      <span style={{ fontSize: 12 }}>􀛨</span>
    </div>
  </div>
);
