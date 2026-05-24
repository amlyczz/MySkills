import React from "react";

interface Props {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}

export const CodeBlock: React.FC<Props> = ({ code, language = "bash", title, className }) => (
  <div
    className={`rounded-[var(--radius-lg,16px)] overflow-hidden font-mono text-sm shadow-[var(--shadow-lg,0_20px_50px_rgba(0,0,0,0.5))] ${className || ""}`}
    style={{ background: "rgba(30,30,30,0.8)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}
  >
    <div className="flex items-center gap-2 px-4 py-3 bg-black/40 border-b border-white/5">
      <div className="flex gap-1.5 mr-2">
        <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
      </div>
      {title && <span className="text-[var(--color-muted,#888)] text-xs font-medium">{title}</span>}
      {language && <span className="text-[var(--color-primary,#4285F4)] text-xs font-medium ml-auto uppercase opacity-60">{language}</span>}
    </div>
    <pre className="p-5 overflow-x-auto m-0 text-base leading-relaxed">
      <code className="text-[var(--color-foreground,#e0e0e0)] whitespace-pre">{code}</code>
    </pre>
  </div>
);
