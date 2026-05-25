import React from "react";

export const FlowMusicCard: React.FC = () => (
  <div className="flex-1 w-full h-full bg-[#161618] rounded-3xl shadow-[0_24px_48px_rgba(0,0,0,0.4)] flex flex-col relative overflow-hidden font-['Inter','Google_Sans',sans-serif] shrink-0">
    <div className="pt-6 px-6 pb-0 flex gap-3">
      <div className="bg-[#2D2D2D] text-[#B3B3B3] px-3 py-1.5 rounded-lg text-xs font-medium">Producer AI</div>
      <div className="text-[#808080] py-1.5 text-xs">Google Flow Music</div>
    </div>
    <div className="flex-1 flex justify-center items-center">
      <div className="w-24 h-24 bg-white rounded-full flex justify-center items-center shadow-[0_0_40px_rgba(255,255,255,0.1)] pl-2">
        <div className="w-0 h-0 border-t-[16px] border-t-transparent border-b-[16px] border-b-transparent border-l-[26px] border-l-black" />
      </div>
    </div>
    <div className="px-6 pb-8 z-10">
      <h2 className="text-[32px] text-white m-0 mb-4 tracking-[-0.03em]">Google Flow Music</h2>
      <div className="bg-white text-black inline-block px-6 py-3 rounded-full font-semibold text-base">Try it now</div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-[linear-gradient(180deg,rgba(22,22,24,0)_0%,rgba(22,22,24,0.2)_20%,rgba(66,133,244,0.4)_60%,rgba(244,143,177,0.8)_100%)] blur-[10px] z-0 pointer-events-none" />
  </div>
);
