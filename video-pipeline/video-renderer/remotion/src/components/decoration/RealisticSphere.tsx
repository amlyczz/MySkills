import React from "react";

interface Props {
  size?: number;
  className?: string;
}

export const RealisticSphere: React.FC<Props> = ({ size, className }) => (
  <div
    className={`rounded-full bg-[radial-gradient(circle_at_30%_28%,#FFFFFF_0%,#F0F0F3_8%,#C8C8CE_22%,#909098_42%,#48484E_65%,#1C1C20_85%,#0A0A0C_100%)] shadow-[inset_-12px_-12px_28px_rgba(0,0,0,0.55),inset_6px_6px_12px_rgba(255,255,255,0.7),0px_20px_40px_rgba(0,0,0,0.12)] ${className || ""}`}
    style={size ? { width: size, height: size } : { width: "100%", height: "100%" }}
  />
);
