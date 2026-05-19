/**
 * layout.ts — 布局、间距、排版常量。
 *
 * 所有基于 1920×1080 画布的定位常量集中在此。
 */

// ── 内边距 ──
/** 内容区域水平内边距 */
export const CONTENT_PAD = 80;
/** 内容区域垂直内边距（与水平一致） */
export const CONTENT_PAD_Y = 80;

// ── 宽度约束 ──
/** 内容区最大宽度 */
export const CONTENT_MAX_WIDTH = 1400;
/** 正文文本最大宽度 */
export const TEXT_MAX_WIDTH = 1200;

// ── 间距 ──
/** 标题与下划线间距 */
export const GAP_TITLE_UNDERLINE = 20;
/** 下划线与标语间距 */
export const GAP_UNDERLINE_TAGLINE = 40;
/** 标语与要点列表间距 */
export const GAP_TAGLINE_POINTS = 52;
/** 要点列表项间距 */
export const GAP_POINTS = 14;
/** URL 与 stats 间距 (Outro) */
export const GAP_URL_STATS = 24;
/** Stats 与下划线间距 (Outro) */
export const GAP_STATS_UNDERLINE = 44;

// ── 排版尺寸 (Intro) ──
/** 标题字号 */
export const FONT_SIZE_TITLE = 88;
/** 标语字号 */
export const FONT_SIZE_TAGLINE = 34;
/** 要点字号 */
export const FONT_SIZE_POINTS = 26;

// ── 排版尺寸 (Outro) ──
/** URL 字号 */
export const FONT_SIZE_URL = 58;
/** Stats 字号 */
export const FONT_SIZE_STATS = 30;
/** Summary 字号 */
export const FONT_SIZE_SUMMARY = 28;

// ── 排版字重 ──
/** 标题字重 */
export const FONT_WEIGHT_TITLE = 800;
/** 标语字重 */
export const FONT_WEIGHT_TAGLINE = 300;
/** 要点字重 */
export const FONT_WEIGHT_POINTS = 400;
/** URL 字重 */
export const FONT_WEIGHT_URL = 700;
/** Stats 字重 */
export const FONT_WEIGHT_STATS = 500;
/** Summary 字重 */
export const FONT_WEIGHT_SUMMARY = 300;

// ── 装饰元素 ──
/** 项目符号圆点直径 */
export const DOT_SIZE = 8;
/** 下划线高度（常规） */
export const UNDERLINE_HEIGHT = 3;
/** 下划线最大宽度 */
export const UNDERLINE_MAX_WIDTH = 480;
/** 下划线圆角 */
export const UNDERLINE_BORDER_RADIUS = 2;
/** Outro 下划线最大宽度 */
export const OUTRO_UNDERLINE_MAX_WIDTH = 400;

// ── 文本变换 ──
/** 需要大写的主题名 */
export const TEXT_TRANSFORM_THEMES = ["minimal-bw", "matte-metal"];

// ── 文本阴影 ──
/** Neon 主题的 glow 效果阴影 */
export const SHADOW_NEON = "0 0 20px rgba(100,100,255,0.8), 0 0 60px rgba(100,100,255,0.4)";
/** Warm 主题的投影 */
export const SHADOW_WARM = "0 2px 8px rgba(0,0,0,0.3)";
/** 默认 text-shadow */
export const SHADOW_DEFAULT = "0 2px 12px rgba(0,0,0,0.15)";
/** Outro Neon 阴影 */
export const SHADOW_NEON_OUTRO = "0 0 15px rgba(100,100,255,0.6)";
