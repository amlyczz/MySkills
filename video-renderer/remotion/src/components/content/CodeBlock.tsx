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
    style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
  >
    {(title || language) && (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5">
        {title && <span className="text-[var(--color-muted,#888)] text-xs font-medium">{title}</span>}
        {language && <span className="text-[var(--color-primary,#4285F4)] text-xs font-medium ml-auto">{language}</span>}
      </div>
    )}
    <pre className="p-5 overflow-x-auto">
      <code className="text-[var(--color-foreground,#e0e0e0)] leading-relaxed whitespace-pre">{code}</code>
    </pre>
  </div>
);
