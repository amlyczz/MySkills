import React from "react";

interface BarProps {
  label: string; endValue: number; maxValue: number;
  isHighlight?: boolean; className?: string;
}

export const AnimatedBar: React.FC<BarProps> = ({ label, endValue, maxValue, isHighlight, className }) => {
  const barWidth = (endValue / maxValue) * 100;
  
  return (
    <div className={`flex items-center gap-10 font-sans w-full max-w-[800px] mb-6 ${className || ""}`}>
      <div className="w-[200px] text-2xl text-black text-right font-medium">{label}</div>
      <div className="flex-1 flex items-center">
        <div 
          className={`h-16 rounded-full flex justify-end items-center pr-6 backdrop-blur-md border border-white/20 ${isHighlight ? 'bg-[#FF4500] shadow-[0_10px_30px_rgba(255,69,0,0.3)]' : 'bg-black/5'}`}
          style={{ width: `${barWidth}%`, minWidth: 60 }}
        >
          <span className={`text-[28px] font-semibold ${isHighlight ? 'text-white' : 'text-black'}`}>
            {endValue}%
          </span>
        </div>
      </div>
    </div>
  );
};
