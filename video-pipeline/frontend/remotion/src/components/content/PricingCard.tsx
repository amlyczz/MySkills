import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export interface CardData {
  title: string; slogan: string; features: string[];
  price: string; accentColor: string;
}

interface Props { data: CardData; className?: string; }

const defaultCardData: CardData = { title: "", slogan: "", features: [], price: "", accentColor: "#4285F4" };

export const PricingCard: React.FC<Props> = ({ data = defaultCardData, className = "" }) => {
  const frame = useCurrentFrame();
  const shimmerX = interpolate(frame % 120, [0, 120], [-100, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div className={`w-[380px] h-[520px] rounded-[32px] bg-[var(--color-surface,#050505)] border border-white/10 overflow-hidden relative shadow-[var(--shadow-lg,0_20px_50px_rgba(0,0,0,0.5))] flex flex-col ${className}`}>
      {/* Visual area */}
      <div className="h-[55%] relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[20%] left-[20%] w-[200px] h-[200px] rounded-full blur-[60px] opacity-50" style={{ backgroundColor: data.accentColor }} />
          <div className="absolute bottom-[10%] right-[10%] w-[150px] h-[150px] bg-white rounded-full blur-[50px] opacity-30" />
          <div className="absolute inset-0 bg-[length:20px_20px] opacity-20" style={{ backgroundImage: `radial-gradient(${data.accentColor} 1px, transparent 1px)` }} />
        </div>
        <div className="absolute top-[30px] left-[30px] z-10">
          <h2 className="m-0 text-[42px] font-bold text-[var(--color-foreground,#FFF)] font-sans tracking-tight">
            {data.title}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="p-[30px] flex-1 flex flex-col justify-between bg-gradient-to-b from-transparent to-[var(--color-surface,#050505)] to-20%">
        <p className="m-0 mb-5 text-[var(--color-muted,#AAA)] text-base leading-relaxed font-sans">
          {data.slogan}
        </p>
        <ul className="list-none p-0 m-0 mb-[30px]">
          {data.features.map((feat, i) => (
            <li key={i} className="text-[var(--color-muted,#888)] text-sm mb-2 font-sans flex items-center">
              <span className="mr-2" style={{ color: data.accentColor }}>&bull;</span>{feat}
            </li>
          ))}
        </ul>
        <div className="flex justify-between items-center">
          <div className="text-[var(--color-foreground,#FFF)] text-[32px] font-bold font-sans">{data.price}</div>
          <div className="bg-[var(--color-foreground,#FFF)] text-[var(--color-background,#000)] rounded-full px-5 py-2.5 text-sm font-semibold font-sans">
            Get started &rarr;
          </div>
        </div>
      </div>

      {/* Shimmer */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.1) 55%, transparent 60%)',
          transform: `translateX(${shimmerX}%)`,
        }}
      />
    </div>
  );
};
