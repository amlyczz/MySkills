import React from "react";

interface Card { label: string; desc: string; color?: string; }

interface Props {
  title: string;
  text: string;
  cards: Card[];
  className?: string;
}

function highlightText(text: string): React.ReactNode {
  return text.split("**").map((part, i) =>
    i % 2 === 0 ? part : <strong key={i} className="font-bold">{part}</strong>
  );
}

export const AISummaryBox: React.FC<Props> = ({ title = "", text = "", cards = [], className }) => (
  <div className={`bg-[#F8F9FA] rounded-2xl p-6 mb-6 border border-[#E5E7EB] font-sans ${className || ""}`}>
    <h3 className="m-0 mb-3 text-[22px] font-semibold text-[#0F0F0F]">{title}</h3>
    <p className="m-0 mb-5 text-[15px] leading-relaxed text-[#333]">
      {highlightText(text)}
    </p>
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-xl overflow-hidden border border-[#E5E7EB]">
          <div 
            className={`h-[120px] flex items-center justify-center text-2xl text-gray-400 ${card.color || 'bg-[#F3F4F6]'}`}
          />
          <div className="p-3">
            <p className="m-0 text-[13px] font-medium text-[#0F0F0F]">{card.label}</p>
            <p className="m-0 mt-1 text-xs text-[#666]">{card.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);
