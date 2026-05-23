/**
 * CodeCarousel — 多代码块轮播布局。
 *
 * 多个代码块在 DeviceFrame(macbook) 内以 Tab 形式自动轮播展示。
 * code 字段格式: "标签1|bash\ncode\n===\n标签2|bash\ncode\n===\n标签3|bash\ncode"
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { LayoutProps } from "../types";
import { DeviceFrame } from "../wrappers/DeviceFrame";

interface CodeTab {
  label: string;
  language: string;
  code: string;
}

function parseTabs(raw: string): CodeTab[] {
  return raw.split("===").map((block) => {
    const lines = block.trim().split("\n");
    const firstLine = lines[0] || "";
    const pipeIdx = firstLine.indexOf("|");
    if (pipeIdx >= 0) {
      return {
        label: firstLine.substring(0, pipeIdx).trim(),
        language: firstLine.substring(pipeIdx + 1).trim(),
        code: lines.slice(1).join("\n"),
      };
    }
    return { label: "Code", language: "bash", code: block.trim() };
  });
}

/** Simple syntax highlighting via regex (same as CodeDisplay) */
function highlightCode(code: string, language: string): { __html: string } {
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Comments
  html = html.replace(/(#[^\n]*)/g, '<span style="color:#6a9955">$1</span>');
  // Strings
  html = html.replace(/(&quot;[^&]*&quot;|'[^']*')/g, '<span style="color:#ce9178">$1</span>');
  // Keywords
  const keywords = /\b(git|cd|bash|pip|python|export|import|from|def|class|return|if|else|for|in|while|try|except|with|as|async|await|function|const|let|var|require|import)\b/g;
  html = html.replace(keywords, '<span style="color:#569cd6">$1</span>');
  // Flags
  html = html.replace(/(--?[a-zA-Z][\w-]*)/g, '<span style="color:#9cdcfe">$1</span>');

  return { __html: html };
}

export const CodeCarousel: React.FC<LayoutProps> = ({
  title,
  code: rawCode,
  style,
  theme,
}) => {
  const frame = useCurrentFrame();

  if (!rawCode) return null;
  const tabs = parseTabs(rawCode);
  if (tabs.length === 0) return null;

  // Auto-advance every 90 frames (3 seconds at 30fps)
  const framesPerTab = 90;
  const activeIdx = Math.min(
    Math.floor(frame / framesPerTab),
    tabs.length - 1,
  );
  const activeTab = tabs[activeIdx];
  const tabProgress = (frame % framesPerTab) / framesPerTab;

  // Reveal-wipe clip
  const clipRight = interpolate(tabProgress, [0, 0.3], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
        gap: 24,
      }}
    >
      {/* Title */}
      {title && (
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: style.bodyColor,
            fontFamily: theme.typography.fontFamily,
            textShadow: "0 2px 12px rgba(0,0,0,0.3)",
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {title}
        </div>
      )}

      <DeviceFrame device="macbook">
        <div style={{ width: "100%", height: "100%", background: "#1e1e1e", display: "flex", flexDirection: "column" }}>
          {/* Tab bar */}
          <div style={{ display: "flex", background: "#2d2d2d", borderBottom: "1px solid #404040", padding: "0 8px" }}>
            {tabs.map((tab, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 16px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: i === activeIdx ? "#fff" : "#888",
                  background: i === activeIdx ? "#1e1e1e" : "transparent",
                  borderBottom: i === activeIdx ? "2px solid #007acc" : "2px solid transparent",
                  cursor: "default",
                }}
              >
                {tab.label}
              </div>
            ))}
          </div>
          {/* Code content with reveal clip */}
          <div
            style={{
              flex: 1,
              padding: "12px 16px",
              overflow: "hidden",
              clipPath: `inset(0 ${clipRight}% 0 0)`,
            }}
          >
            <pre
              style={{
                margin: 0,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                color: "#d4d4d4",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              dangerouslySetInnerHTML={highlightCode(activeTab.code, activeTab.language)}
            />
          </div>
        </div>
      </DeviceFrame>
    </AbsoluteFill>
  );
};
