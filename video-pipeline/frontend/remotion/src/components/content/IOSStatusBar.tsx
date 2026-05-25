import React from "react";

export const IOSStatusBar: React.FC = () => (
  <div className="h-[54px] flex items-end justify-between px-6 pb-2 text-sm font-semibold text-black">
    <span>9:41</span>
    <div className="flex gap-1.5 items-center">
      <span className="text-xs">􀋦</span>
      <span className="text-xs">􀊨</span>
      <span className="text-xs">􀛨</span>
    </div>
  </div>
);
