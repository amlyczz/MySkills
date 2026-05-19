/**
 * tokens.ts — Design Token 系统。
 *
 * 从 StyleTemplate 推导出组件可直接使用的 CSS 属性对象。
 * 替代旧版直接从 Theme 推导的零散函数。
 */
import { StyleTemplate, StyleTokens } from "./types";
import {
  SHADOW_NEON,
  SHADOW_WARM,
  SHADOW_DEFAULT,
  SHADOW_NEON_OUTRO,
} from "./layout";

/** 提取渐变色中的第一个十六进制颜色作为遮罩底色 */
export function extractBaseColor(bg: string): string {
  if (bg.startsWith("#")) return bg;
  const match = bg.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : "#000000";
}

/** 十六进制颜色转 RGBA */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 半透明遮罩渐变色 */
export function overlayGradient(style: StyleTemplate): string {
  const base = extractBaseColor(style.colors.background);
  return `linear-gradient(135deg, ${hexToRgba(base, 0.88)}, ${hexToRgba(base, 0.72)})`;
}

/** 下划线渐变色 */
export function underlineGradient(accent: string): string {
  return `linear-gradient(90deg, transparent, ${accent}, transparent)`;
}

/** 获取标题 text-shadow */
function resolveTitleShadow(
  style: StyleTemplate,
  context: "intro" | "outro" = "intro",
): string {
  const preset = style.effects?.shadowPreset;
  if (preset === "neon") {
    return context === "intro" ? SHADOW_NEON : SHADOW_NEON_OUTRO;
  }
  if (preset === "warm") return SHADOW_WARM;
  return SHADOW_DEFAULT;
}

/** 是否需要大写转换 */
export function resolveTextTransform(
  style: StyleTemplate,
): "uppercase" | "none" {
  return style.decoration.textTransform === "uppercase"
    ? "uppercase"
    : "none";
}

/** 从 StyleTemplate 解析完整的 Design Tokens */
export function resolveStyleTokens(style: StyleTemplate): StyleTokens {
  return {
    bgBaseColor: extractBaseColor(style.colors.background),
    overlayBg: overlayGradient(style),
    titleShadow: resolveTitleShadow(style),
    bodyColor: style.colors.text,
    mutedColor: style.colors.textMuted,
    underlineBg: underlineGradient(style.colors.accent),
    bulletColor: style.colors.accent,
    titleFont: style.typography.fontFamily,
    titleTransform: resolveTextTransform(style),
  };
}
