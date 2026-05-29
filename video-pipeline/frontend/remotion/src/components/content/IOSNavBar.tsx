import React from "react";

interface Props { tabs: string[]; activeTab?: number; }

export const IOSNavBar: React.FC<Props> = ({ tabs = [], activeTab = 0 }) => (
  <div className="flex gap-2 px-4 py-2 overflow-x-hidden">
    {tabs.map((tab, i) => (
      <div key={i} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 ${i === activeTab ? "bg-[#F2F2F7] text-black" : "bg-transparent text-black"}`}>
        {tab}
      </div>
    ))}
  </div>
);
