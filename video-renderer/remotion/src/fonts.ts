/**
 * fonts.ts — 字体加载与 fallback 定义。
 *
 * 集中管理所有 Google Fonts 的加载调用，组件不再直接导入字体加载函数。
 */
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadNotoSansSC } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadPlayfairDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

/** 初始化所有字体加载。在应用入口处调用一次即可。 */
export function initFonts(): void {
  loadFont("normal", { weights: [200, 300, 400, 700, 800] as any, subsets: ["latin", "latin-ext"] });
  loadNotoSansSC("normal", { weights: [400, 700] as any, subsets: ["chinese-simplified", "latin"] });
  loadPlayfairDisplay("normal", { weights: [400, 700] as any, subsets: ["latin", "latin-ext"] });
  loadJetBrainsMono("normal", { weights: [400, 700] as any, subsets: ["latin", "latin-ext"] });
}

/** 字体族映射：通过 Theme.fontFamily 中的第一个字体名选用 */
export const FONT_FAMILIES = {
  inter: "'Inter', 'Noto Sans SC', sans-serif",
  playfair: "'Playfair Display', 'Noto Sans SC', serif",
  jetbrains: "'JetBrains Mono', 'Noto Sans SC', monospace",
} as const;
