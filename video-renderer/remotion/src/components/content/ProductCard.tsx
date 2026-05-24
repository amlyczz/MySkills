import React from "react";
import { Img, staticFile } from "remotion";

interface Props {
  title: string;
  description: string;
  imageUrl?: string;
  accentColor?: string;
  className?: string;
}

export const ProductCard: React.FC<Props> = ({
  title, description, imageUrl, accentColor = "#F4C542", className = "",
}) => (
  <div className={`w-[320px] h-[420px] bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col shrink-0 font-sans ${className}`}>
    <div className="h-[180px] bg-[#f0f0f0] relative flex items-center justify-center text-[48px]">
      {imageUrl ? (
        <Img src={staticFile(imageUrl)} className="w-full h-full object-cover" alt={title} />
      ) : (
        <span className="opacity-30">📦</span>
      )}
    </div>
    <div className="p-6 flex-1">
      <h3 className="m-0 mb-2 text-xl font-semibold text-[#111]">{title}</h3>
      <p className="m-0 text-sm text-[#666] leading-relaxed">{description}</p>
    </div>
    <div className="px-6 pb-6">
      <div 
        className="border-none rounded-full px-6 py-2.5 text-sm font-medium text-white inline-block cursor-default"
        style={{ background: accentColor }}
      >
        Try it now
      </div>
    </div>
  </div>
);
