import React from "react";

interface Props {
  icon: string; title: string; subtitle?: string;
  iconBg?: string; className?: string;
}

export const IOSListItem: React.FC<Props> = ({ icon, title, subtitle, iconBg = "#F2F2F7", className = "" }) => (
  <div className={`flex items-center px-4 py-3 bg-white border-b border-[#F0F0F0] ${className}`}>
    <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 text-base" style={{ background: iconBg }}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-[15px] font-semibold text-black">{title}</div>
      {subtitle && <div className="text-[13px] text-[#86868B] mt-0.5">{subtitle}</div>}
    </div>
    <span className="text-[#C7C7CC] text-sm">›</span>
  </div>
);
