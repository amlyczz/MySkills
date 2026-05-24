import React from "react";

interface Props {
  icon: string; title: string; description: string; author: string;
  className?: string;
}

export const AgentCard: React.FC<Props> = ({ icon, title, description, author, className }) => (
  <div className={`w-full max-w-[480px] bg-white/75 backdrop-blur-3xl rounded-[24px] p-8 border border-white/40 shadow-[0_24px_48px_rgba(0,0,0,0.08)] font-sans ${className || ""}`}>
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 rounded-xl bg-black text-white flex justify-center items-center text-xl font-bold">{icon}</div>
      <h3 className="m-0 text-2xl text-black font-semibold">{title}</h3>
    </div>
    <p className="m-0 mb-6 text-lg text-[#666] leading-relaxed">{description}</p>
    <div className="flex justify-between items-center text-sm">
      <span className="text-[#666]">By {author}</span>
      <div className="flex -space-x-2">
        {["bg-[#E0E0E0]", "bg-[#C0C0C0]", "bg-[#A0A0A0]"].map((c, i) => (
          <div key={i} className={`w-7 h-7 rounded-full border-2 border-white ${c}`} />
        ))}
      </div>
    </div>
  </div>
);
