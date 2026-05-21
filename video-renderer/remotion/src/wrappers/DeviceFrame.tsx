/**
 * DeviceFrame — 3D 设备外壳包装器。
 *
 * 将视频/截图嵌入带有透视感的设备模型中。
 * 支持 laptop 和 phone 两种模式。
 *
 * Props:
 *   device: "macbook" | "iphone"
 *   children: 屏幕内容（视频/图片）
 */
import React from "react";

interface Props {
  device?: "macbook" | "iphone";
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<Props> = ({ device = "macbook", children }) => {
  if (device === "iphone") {
    return (
      <div style={{ perspective: "800px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{
          position: "relative", width: 340, height: 680,
          borderRadius: 48, background: "#1a1a1a",
          border: "3px solid #333", boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 0 2px rgba(255,255,255,0.1)",
          padding: 12, transform: "rotateY(-5deg) rotateX(5deg)", transformStyle: "preserve-3d",
        }}>
          {/* Notch */}
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 120, height: 28, background: "#111", borderRadius: "0 0 16px 16px", zIndex: 2 }} />
          {/* Screen */}
          <div style={{ width: "100%", height: "100%", borderRadius: 36, overflow: "hidden", background: "#000" }}>
            {children}
          </div>
          {/* Glossy reflection */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 48, background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)", pointerEvents: "none" }} />
        </div>
      </div>
    );
  }

  // macbook
  return (
    <div style={{ perspective: "1000px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Lid */}
      <div style={{
        position: "relative", width: 780, height: 490,
        borderRadius: "12px 12px 0 0", background: "#1a1a1a",
        border: "2px solid #333", borderBottom: "none",
        boxShadow: "0 10px 40px rgba(0,0,0,0.4)", padding: "24px 48px 16px",
        transform: "rotateX(5deg)", transformStyle: "preserve-3d",
      }}>
        {/* Camera notch */}
        <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", width: 8, height: 8, borderRadius: "50%", background: "#222" }} />
        {/* Screen */}
        <div style={{ width: "100%", height: "100%", borderRadius: 4, overflow: "hidden", background: "#000" }}>
          {children}
        </div>
        {/* Glossy */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "12px 12px 0 0", background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 40%)", pointerEvents: "none" }} />
      </div>
      {/* Base */}
      <div style={{ width: 840, height: 12, background: "#1a1a1a", borderRadius: "0 0 6px 6px", border: "2px solid #333", borderTop: "none" }} />
      <div style={{ width: 200, height: 8, background: "#222", borderRadius: "0 0 4px 4px" }} />
    </div>
  );
};
