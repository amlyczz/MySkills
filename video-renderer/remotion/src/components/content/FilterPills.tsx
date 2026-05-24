import React from "react";

interface Props {
  items: string[];
  activeIndex?: number;
}

export const FilterPills: React.FC<Props> = ({ items, activeIndex = 0 }) => {
  return (
    <div className="flex gap-2.5 justify-center items-center font-['Inter','Google_Sans',sans-serif]">
      {items.map((item, i) => {
        const active = i === activeIndex;
        return (
          <div key={i} className={`px-5 py-2.5 rounded-full text-[15px] font-medium cursor-default ${active ? "bg-[#202120] text-white border-none" : "bg-transparent text-[#202120] border border-[#DADCE0]"}`}>
            {item}
          </div>
        );
      })}
    </div>
  );
};
