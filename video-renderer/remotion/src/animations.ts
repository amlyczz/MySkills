/**
 * animations.ts — spring 参数预设、stagger 配置、easing 曲线。
 *
 * 所有动画常量集中定义，组件引用预设而非内联数值。
 */

// ── Spring 参数预设 ─────────────────────────────────────────

/** 标题入场：临界阻尼，无 overshoot 振荡 */
export const SPRING_TITLE = { mass: 1.0, damping: 20, stiffness: 80 } as const;

/** 要点列表入场：轻量、略带回弹 */
export const SPRING_POINT = { mass: 0.8, damping: 18, stiffness: 80 } as const;

/** Outro URL 入场：厚重、沉稳 */
export const SPRING_URL = { mass: 1.2, damping: 20, stiffness: 80 } as const;

/** 正文元素入场：适中、柔和 */
export const SPRING_BODY = { mass: 0.8, damping: 20 } as const;

// ── 时间线预设 ──────────────────────────────────────────────
//
// 所有帧数均基于 30fps。总时长 300 帧 = 10 秒。
// 每个元素的入场动画跨度 ~50 帧（~1.7s），元素间隔 ~20 帧（~0.7s）。

export const TIMING = {
  /** Overlay 淡入帧区间 */
  OVERLAY_FADE: [0, 20] as [number, number],

  // Intro 时间线
  /** 标题入场帧区间 */
  TITLE_INTRO: [20, 75] as [number, number],
  /** 下划线从中心生长帧区间 */
  UNDERLINE_GROW: [60, 110] as [number, number],
  /** 标语淡入帧区间 */
  TAGLINE_INTRO: [80, 130] as [number, number],
  /** 要点列表入场起始帧 */
  POINTS_START: 110,
  /** 要点列表入场间隔帧数 */
  POINTS_STAGGER: 18,

  // Outro 时间线
  /** URL spring 入场帧区间 */
  URL_INTRO: [20, 75] as [number, number],
  /** Stats 淡入帧区间 */
  STATS_INTRO: [60, 110] as [number, number],
  /** Outro 下划线生长帧区间 */
  OUTRO_UNDERLINE_GROW: [90, 140] as [number, number],
  /** Summary 淡入帧区间 */
  SUMMARY_INTRO: [120, 180] as [number, number],
} as const;

// ── 动画辅助函数 ────────────────────────────────────────────

/** Anticipate 回弹位移帧数 */
export const ANTICIPATE_FRAMES = 6;
