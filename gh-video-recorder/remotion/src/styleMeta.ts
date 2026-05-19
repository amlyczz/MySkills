/**
 * styleMeta.ts — 样式元数据 + matchStyle() 推荐引擎。
 *
 * 从 themeMeta.ts 迁移，增加 family 分类。
 * 用于 code agent 根据仓库信息智能匹配样式。
 */
import { BgType } from "./backgrounds";
import { StyleFamily, StyleMeta } from "./types";

export const styleMetaList: StyleMeta[] = [
  {
    id: "dark-purple",
    displayName: "Dark Purple",
    family: "tech",
    mood: ["dark", "tech"],
    bestFor: ["Go", "infrastructure", "backend", "CLI tools"],
    defaultBgType: "geometric",
    preview: { bg: "#0f0c29", text: "#fff", accent: "#6c63ff" },
  },
  {
    id: "light-teal",
    displayName: "Light Teal",
    family: "business",
    mood: ["light", "creative"],
    bestFor: ["documentation", "tutorials", "frontend", "API docs"],
    defaultBgType: "bokeh",
    preview: { bg: "#e0f7fa", text: "#1a237e", accent: "#00838f" },
  },
  {
    id: "warm-orange",
    displayName: "Warm Orange",
    family: "playful",
    mood: ["warm", "playful"],
    bestFor: ["creative coding", "design", "community resources"],
    defaultBgType: "pixel",
    preview: { bg: "#ff6f00", text: "#fff", accent: "rgba(255,255,255,0.6)" },
  },
  {
    id: "dark-red",
    displayName: "Dark Red",
    family: "business",
    mood: ["dark", "minimal"],
    bestFor: ["media", "content platforms", "blogging"],
    defaultBgType: "starfield",
    preview: { bg: "#1a0000", text: "#f5e6e6", accent: "#c62828" },
  },
  {
    id: "glassmorphism",
    displayName: "Glassmorphism",
    family: "creative",
    mood: ["creative", "tech"],
    bestFor: ["fullstack", "design systems", "UI libraries"],
    defaultBgType: "bokeh",
    preview: { bg: "#667eea", text: "#fff", accent: "#a78bfa" },
  },
  {
    id: "minimal-bw",
    displayName: "Minimal Black & White",
    family: "minimal",
    mood: ["minimal", "cold"],
    bestFor: ["documentation", "API references", "CLI tools", "standards"],
    defaultBgType: "geometric",
    preview: { bg: "#0a0a0a", text: "#fff", accent: "#444" },
  },
  {
    id: "nature-green",
    displayName: "Nature Green",
    family: "business",
    mood: ["warm", "minimal"],
    bestFor: [
      "data science",
      "bioinformatics",
      "education",
      "sustainability",
    ],
    defaultBgType: "starfield",
    preview: { bg: "#1b5e20", text: "#fff", accent: "#81c784" },
  },
  {
    id: "tech-grid",
    displayName: "Tech Grid",
    family: "tech",
    mood: ["tech", "dark"],
    bestFor: ["Python", "AI", "ML", "data engineering", "infrastructure"],
    defaultBgType: "geometric",
    preview: { bg: "#0d1b2a", text: "#fff", accent: "#4169e1" },
  },
  {
    id: "warm-yellow",
    displayName: "Warm Yellow",
    family: "playful",
    mood: ["warm", "playful"],
    bestFor: ["creative projects", "marketing", "learning resources"],
    defaultBgType: "pixel",
    preview: { bg: "#f57f17", text: "#1a1a1a", accent: "#bf360c" },
  },
  {
    id: "sakura-pink",
    displayName: "Sakura Pink",
    family: "creative",
    mood: ["light", "warm", "creative"],
    bestFor: ["JavaScript", "Frontend", "Design", "CSS"],
    defaultBgType: "bokeh",
    preview: { bg: "#fce4ec", text: "#4a1a2e", accent: "#d81b60" },
  },
  {
    id: "neon-blue",
    displayName: "Neon Blue",
    family: "tech",
    mood: ["dark", "tech", "playful"],
    bestFor: ["gaming", "game engines", "creative coding", "WebGL"],
    defaultBgType: "pixel",
    preview: { bg: "#0a0020", text: "#fff", accent: "#6464ff" },
  },
  {
    id: "matte-metal",
    displayName: "Matte Metal",
    family: "minimal",
    mood: ["dark", "cold", "minimal"],
    bestFor: ["Rust", "systems programming", "backend", "embedded"],
    defaultBgType: "starfield",
    preview: { bg: "#263238", text: "#eceff1", accent: "#78909c" },
  },
];

/**
 * 根据仓库主语言和 topics 推荐样式。
 */
export function matchStyle(
  language?: string,
  topics: string[] = [],
): { styleId: string; bgType: BgType } {
  const lang = (language ?? "").toLowerCase();
  const topicsLower = topics.map((t) => t.toLowerCase());
  const allKeywords = [lang, ...topicsLower];

  let bestScore = -1;
  let bestMatch = styleMetaList[0];

  for (const meta of styleMetaList) {
    let score = 0;
    for (const keyword of allKeywords) {
      for (const tag of meta.bestFor) {
        if (
          tag.toLowerCase().includes(keyword) ||
          keyword.includes(tag.toLowerCase())
        ) {
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

  return { styleId: bestMatch.id, bgType: bestMatch.defaultBgType };
}
