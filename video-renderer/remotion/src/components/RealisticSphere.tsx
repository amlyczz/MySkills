import React from "react";

interface Props {
  size?: number;
  style?: React.CSSProperties;
}

export const RealisticSphere: React.FC<Props> = ({ size = 200, style }) => (
  <div style={{
    width: size, height: size,
    borderRadius: "50%",
    background: `
      radial-gradient(circle at 30% 28%,
        #FFFFFF 0%,
        #F0F0F3 8%,
        #C8C8CE 22%,
        #909098 42%,
        #48484E 65%,
        #1C1C20 85%,
        #0A0A0C 100%
      )`,
    boxShadow: `
      inset -12px -12px 28px rgba(0,0,0,0.55),
      inset 6px 6px 12px rgba(255,255,255,0.7),
      0px 20px 40px rgba(0,0,0,0.12)
    `,
    ...style,
  }} />
);
