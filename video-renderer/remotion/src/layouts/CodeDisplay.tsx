/**
 * CodeDisplay — 代码展示布局。
 *
 * 终端风格窗口（macOS 三色圆点）+ 语法高亮行 + 行号。
 * 支持 type（逐字）、fade（淡入）、scroll（滚动）三种入场动画。
 * highlightLines 数组指定高亮行（脉冲发光效果）。
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { LayoutProps } from "../types";
import {
  CONTENT_PAD,
  CARD_BORDER_RADIUS,
} from "../layout";

/** 语法关键词简单高亮（无需外部依赖） */
function highlightCode(
  code: string,
  language: string,
): Array<{ text: string; className: string }> {
  const lines = code.split("\n");
  const result: Array<{ text: string; className: string }> = [];

  const keywords: Record<string, RegExp[]> = {
    js: [/\b(const|let|var|function|return|import|export|from|if|else|async|await|class|new|this|try|catch|throw|typeof)\b/g],
    ts: [/\b(const|let|var|function|return|import|export|from|if|else|async|await|class|new|this|try|catch|throw|typeof|interface|type|enum|readonly)\b/g],
    py: [/\b(def|class|import|from|return|if|elif|else|try|except|raise|with|as|async|await|yield|lambda|pass|break|continue|and|or|not|in|is|None|True|False|self)\b/g],
    bash: [/\b(npx|npm|yarn|git|gh|curl|wget|docker|kubectl|export|source|echo|cd|ls|cat|mkdir|rm|cp|mv|chmod|sudo)\b/g],
    go: [/\b(func|package|import|return|if|else|for|range|go|defer|chan|select|switch|case|default|var|const|type|struct|interface|map|nil|true|false|error|string|int|bool)\b/g],
    rs: [/\b(fn|let|mut|const|pub|use|mod|impl|struct|enum|trait|match|if|else|for|while|loop|return|where|as|in|ref|self|Self|true|false|unsafe|async|await|dyn|move|type|Some|None|Ok|Err|Result|Option|Vec)\b/g],
  };

  const wordPattern = keywords[language] || keywords["bash"];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    // 注释
    if (/^\s*(\/\/|#|--) /.test(line) || /^\s*\/\*/.test(line)) {
      result.push({ text: line, className: "comment" });
      continue;
    }
    // 字符串
    if (/['"`]/.test(line) && (line.includes("'") || line.includes('"') || line.includes("`"))) {
      let remaining = line;
      const tokens: Array<{ text: string; className: string }> = [];
      while (remaining.length > 0) {
        const strMatch = remaining.match(/(`[^`]*`|"[^"]*"|'[^']*')/);
        if (strMatch && strMatch.index !== undefined) {
          const before = remaining.slice(0, strMatch.index);
          if (before) tokens.push({ text: highlightWords(before, wordPattern), className: "normal" });
          tokens.push({ text: strMatch[0], className: "string" });
          remaining = remaining.slice(strMatch.index + strMatch[0].length);
        } else {
          tokens.push({ text: highlightWords(remaining, wordPattern), className: "normal" });
          remaining = "";
        }
      }
      // Flatten tokens into pseudo-classes
      for (const t of tokens) {
        result.push({ text: t.text, className: t.className });
      }
    } else {
      result.push({ text: highlightWords(line, wordPattern), className: "normal" });
    }
  }

  return result;
}

function highlightWords(text: string, patterns: RegExp[]): string {
  let result = text;
  for (const p of patterns) {
    result = result.replace(p, (match) => `__KW__${match}__/KW__`);
  }
  return result;
}

/** 安全地从多行代码中提取行列表 */
function getCodeLines(code?: string): string[] {
  return (code || "").split("\n");
}

const CODE_LINE_HEIGHT = 28;
const CODE_FONT_SIZE = 22;
const CODE_PADDING = 24;
const LINE_NUM_WIDTH = 48;
const MAX_VISIBLE_LINES = 16;

export const CodeDisplay: React.FC<LayoutProps> = ({
  code = "",
  language = "bash",
  highlightLines = [],
  showLineNumbers = true,
  codeAnimation = "type",
  style,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = getCodeLines(code);
  const maxLines = Math.min(lines.length, MAX_VISIBLE_LINES);

  // ── 入场动画 ──
  let revealProgress = 1;
  if (codeAnimation === "type") {
    // 打字效果：逐行出现，每行约 8 帧
    revealProgress = interpolate(frame, [0, maxLines * 8], [0, maxLines], {
      extrapolateRight: "clamp",
    });
  } else if (codeAnimation === "fade") {
    revealProgress = interpolate(frame, [0, 20], [0, maxLines], {
      extrapolateRight: "clamp",
    });
  } else if (codeAnimation === "scroll") {
    revealProgress = interpolate(frame, [0, 40], [0, maxLines], {
      extrapolateRight: "clamp",
    });
  } else {
    // fade default
    revealProgress = interpolate(frame, [0, 20], [0, maxLines], {
      extrapolateRight: "clamp",
    });
  }

  const visibleLineCount = Math.floor(revealProgress);

  const colors = {
    bg: "#1e1e2e",
    surface: "#2a2a3c",
    text: style.bodyColor,
    muted: style.mutedColor,
    accent: theme.colors.accent,
    keyword: theme.colors.primary,
    string: "#a6e3a1",
    comment: "#6c7086",
    lineNum: "#585b70",
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: CONTENT_PAD,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      }}
    >
      <div
        style={{
          width: 900,
          maxWidth: "90%",
          borderRadius: CARD_BORDER_RADIUS,
          overflow: "hidden",
          boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
          border: `1px solid rgba(255,255,255,0.06)`,
        }}
      >
        {/* macOS 三色圆点 */}
        <div
          style={{
            height: 40,
            background: colors.surface,
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            gap: 10,
            borderBottom: `1px solid rgba(255,255,255,0.06)`,
          }}
        >
          <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#ff5f56" }} />
          <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#27c93f" }} />
          <span
            style={{
              marginLeft: 16,
              fontSize: 13,
              color: colors.muted,
              opacity: 0.6,
            }}
          >
            {language.toUpperCase()}
          </span>
        </div>

        {/* Code Window */}
        <div
          style={{
            background: colors.bg,
            padding: CODE_PADDING,
            minHeight: maxLines * CODE_LINE_HEIGHT + CODE_PADDING * 2,
            overflow: "hidden",
          }}
        >
          {lines.slice(0, maxLines).map((line, i) => {
            const isVisible = i < visibleLineCount;
            const isHighlighted = highlightLines.includes(i + 1);
            const fadeIn = codeAnimation === "type"
              ? interpolate(frame - i * 8, [0, 4], [0, 1], { extrapolateRight: "clamp" })
              : isVisible ? 1 : 0;

            // Parse highlights in line
            const parsed = highlightCode(line, language);

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  height: CODE_LINE_HEIGHT,
                  lineHeight: `${CODE_LINE_HEIGHT}px`,
                  opacity: fadeIn,
                  background: isHighlighted
                    ? `rgba(${hexToRgb(colors.accent)}, 0.15)`
                    : "transparent",
                  borderRadius: isHighlighted ? 4 : 0,
                  marginBottom: isHighlighted ? 2 : 0,
                  transition: "background 0.3s",
                }}
              >
                {/* Line Number */}
                {showLineNumbers && (
                  <span
                    style={{
                      width: LINE_NUM_WIDTH,
                      textAlign: "right",
                      paddingRight: 16,
                      fontSize: CODE_FONT_SIZE,
                      color: colors.lineNum,
                      flexShrink: 0,
                      userSelect: "none",
                    }}
                  >
                    {i + 1}
                  </span>
                )}

                {/* Code Text */}
                <span
                  style={{
                    fontSize: CODE_FONT_SIZE,
                    whiteSpace: "pre",
                    color: colors.text,
                  }}
                >
                  {parsed.map((token, j) => (
                    <span
                      key={j}
                      style={{
                        color:
                          token.className === "keyword"
                            ? colors.keyword
                            : token.className === "string"
                            ? colors.string
                            : token.className === "comment"
                            ? colors.comment
                            : colors.text,
                      }}
                    >
                      {token.className === "normal"
                        ? token.text.replace(
                            /__KW__([^_]*)__\/KW__/g,
                            (_: string, m: string) => m,
                          )
                        : token.text}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** 辅助：hex → rgb */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const [r, g, b] = h;
    return `${parseInt(r + r, 16)}, ${parseInt(g + g, 16)}, ${parseInt(b + b, 16)}`;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
