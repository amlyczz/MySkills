import { BgType } from "./backgrounds";

/**
 * ThemeMeta — 主题元数据，用于主题推荐、预览和自动选择。
 *
 * 与 themes.ts 中的 Theme 接口一一对应，只含元数据不含样式值。
 */
export interface ThemeMeta {
  id: string;
  displayName: string;
  mood: ("dark" | "light" | "warm" | "cold" | "tech" | "creative" | "minimal" | "playful")[];
  bestFor: string[];
  defaultBgType: BgType;
  preview: { bg: string; text: string; accent: string };
}

export const themeMetaList: ThemeMeta[] = [
  {
    id: "dark-purple",
    displayName: "Dark Purple",
    mood: ["dark", "tech"],
    bestFor: ["Go", "infrastructure", "backend", "CLI tools"],
    defaultBgType: "geometric",
    preview: { bg: "#0f0c29", text: "#fff", accent: "#6c63ff" },
  },
  {
    id: "light-teal",
    displayName: "Light Teal",
    mood: ["light", "creative"],
    bestFor: ["documentation", "tutorials", "frontend", "API docs"],
    defaultBgType: "bokeh",
    preview: { bg: "#e0f7fa", text: "#1a237e", accent: "#00838f" },
  },
  {
    id: "warm-orange",
    displayName: "Warm Orange",
    mood: ["warm", "playful"],
    bestFor: ["creative coding", "design", "community resources"],
    defaultBgType: "pixel",
    preview: { bg: "#ff6f00", text: "#fff", accent: "rgba(255,255,255,0.6)" },
  },
  {
    id: "dark-red",
    displayName: "Dark Red",
    mood: ["dark", "minimal"],
    bestFor: ["media", "content platforms", "blogging"],
    defaultBgType: "starfield",
    preview: { bg: "#1a0000", text: "#f5e6e6", accent: "#c62828" },
  },
  {
    id: "glassmorphism",
    displayName: "Glassmorphism",
    mood: ["creative", "tech"],
    bestFor: ["fullstack", "design systems", "UI libraries"],
    defaultBgType: "bokeh",
    preview: { bg: "#667eea", text: "#fff", accent: "#a78bfa" },
  },
  {
    id: "minimal-bw",
    displayName: "Minimal Black & White",
    mood: ["minimal", "cold"],
    bestFor: ["documentation", "API references", "CLI tools", "standards"],
    defaultBgType: "geometric",
    preview: { bg: "#0a0a0a", text: "#fff", accent: "#444" },
  },
  {
    id: "nature-green",
    displayName: "Nature Green",
    mood: ["warm", "minimal"],
    bestFor: ["data science", "bioinformatics", "education", "sustainability"],
    defaultBgType: "starfield",
    preview: { bg: "#1b5e20", text: "#fff", accent: "#81c784" },
  },
  {
    id: "tech-grid",
    displayName: "Tech Grid",
    mood: ["tech", "dark"],
    bestFor: ["Python", "AI", "ML", "data engineering", "infrastructure"],
    defaultBgType: "geometric",
    preview: { bg: "#0d1b2a", text: "#fff", accent: "#4169e1" },
  },
  {
    id: "warm-yellow",
    displayName: "Warm Yellow",
    mood: ["warm", "playful"],
    bestFor: ["creative projects", "marketing", "learning resources"],
    defaultBgType: "pixel",
    preview: { bg: "#f57f17", text: "#1a1a1a", accent: "#bf360c" },
  },
  {
    id: "sakura-pink",
    displayName: "Sakura Pink",
    mood: ["light", "warm", "creative"],
    bestFor: ["JavaScript", "Frontend", "Design", "CSS"],
    defaultBgType: "bokeh",
    preview: { bg: "#fce4ec", text: "#4a1a2e", accent: "#d81b60" },
  },
  {
    id: "neon-blue",
    displayName: "Neon Blue",
    mood: ["dark", "tech", "playful"],
    bestFor: ["gaming", "game engines", "creative coding", "WebGL"],
    defaultBgType: "pixel",
    preview: { bg: "#0a0020", text: "#fff", accent: "#6464ff" },
  },
  {
    id: "matte-metal",
    displayName: "Matte Metal",
    mood: ["dark", "cold", "minimal"],
    bestFor: ["Rust", "systems programming", "backend", "embedded"],
    defaultBgType: "starfield",
    preview: { bg: "#263238", text: "#eceff1", accent: "#78909c" },
  },
];

/**
 * 根据仓库主语言和 topics 推荐主题 ID 和 bg-type。
 */
export function recommendTheme(
  language?: string,
  topics: string[] = [],
): { themeId: string; bgType: BgType } {
  const lang = (language ?? "").toLowerCase();
  const topicsLower = topics.map((t) => t.toLowerCase());
  const allKeywords = [lang, ...topicsLower];

  // 评分每个主题
  let bestScore = -1;
  let bestMatch = themeMetaList[0];

  for (const meta of themeMetaList) {
    let score = 0;
    for (const keyword of allKeywords) {
      for (const tag of meta.bestFor) {
        if (tag.toLowerCase().includes(keyword) || keyword.includes(tag.toLowerCase())) {
          score += 10;
        }
      }
      for (const mood of meta.mood) {
        if (mood === keyword) {
          score += 5;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = meta;
    }
  }

  return { themeId: bestMatch.id, bgType: bestMatch.defaultBgType };
}
