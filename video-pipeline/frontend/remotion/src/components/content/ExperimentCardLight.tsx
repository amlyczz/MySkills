import React from "react";

export const ExperimentCardLight: React.FC<{
  title: string; description: string; imageColor: string; accentColor?: string;
}> = ({ title, description, imageColor, accentColor = "#4285F4" }) => (
  <div className="flex-1 w-full h-full bg-white rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden font-['Inter','Google_Sans','Helvetica_Neue',sans-serif] shrink-0">
    <div className="h-[60%] m-3 rounded-2xl" style={{ backgroundColor: imageColor }} />
    <div className="p-0 px-6 pb-6 flex flex-col flex-1">
      <h2 className="text-[28px] text-[#202120] my-3 font-bold">{title}</h2>
      <p className="text-base text-[#5F6368] leading-relaxed m-0 flex-1">{description}</p>
      <div className="font-bold mt-auto text-base" style={{ color: accentColor }}>
        Learn more &rarr;
      </div>
    </div>
  </div>
);
