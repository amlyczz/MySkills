/**
 * tokens.ts — 从 themes 推导的 CSS 属性对象。
 *
 * 提供预计算的主题派生值，减少组件中的重复计算。
 */
import { Theme } from "./themes";
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
export function overlayGradient(theme: Theme): string {
  const base = extractBaseColor(theme.bg);
  return `linear-gradient(135deg, ${hexToRgba(base, 0.88)}, ${hexToRgba(base, 0.72)})`;
}

/** 下划线渐变色 */
export function underlineGradient(accent: string): string {
  return `linear-gradient(90deg, transparent, ${accent}, transparent)`;
}

/** 获取标题 text-shadow */
export function titleShadow(themeName: string, context: "intro" | "outro" = "intro"): string {
  if (themeName === "neon-blue") {
    return context === "intro" ? SHADOW_NEON : SHADOW_NEON_OUTRO;
  }
  if (themeName === "warm-orange") return SHADOW_WARM;
  return SHADOW_DEFAULT;
}

/** 是否需要大写转换 */
export function shouldUppercase(themeName: string): "uppercase" | undefined {
  return themeName === "minimal-bw" || themeName === "matte-metal"
    ? "uppercase"
    : undefined;
}
