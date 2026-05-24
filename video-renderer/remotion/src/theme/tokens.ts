// ============================================================
// Neon theme (existing — used by DarkNeon, ElevenLabs, etc.)
// ============================================================
export const colors = {
  bg: "#0A0F0C",
  panel: "rgba(15, 20, 18, 0.65)",
  panelBorder: "rgba(0, 245, 212, 0.25)",
  neon: "#00F5D4",
  neonSoft: "#72EFDD",
  neonDeep: "#00D4AA",
  text: "#FFFFFF",
  textDim: "#A0A8A5",
  textMuted: "#6B7571",
  cardBg: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.1)",
  userBubble: "rgba(0, 245, 212, 0.15)",
  userBubbleBorder: "rgba(0, 245, 212, 0.3)",
  agentBubble: "rgba(255,255,255,0.05)",
  agentBubbleBorder: "rgba(255,255,255,0.1)",
} as const;

// ============================================================
// Cohere / Light product theme (per 视频模板工程规范)
// ============================================================
export const cohereColors = {
  textPrimary: "#000000",
  textInverse: "#FFFFFF",
  textSecondary: "rgba(0,0,0,0.6)",
  surfaceCard: "#FFFFFF",
  surfaceShadow: "rgba(0,0,0,0.08)",
  surfaceBg: "#FAFAFA",
  surfaceBgAlt: "#F8F8FA",
  chartAccentStart: "#FF7B72",
  chartAccentEnd: "#FF3B30",
  chartAccent: "linear-gradient(90deg, #FF7B72, #FF3B30)",
  chartBase: "#E5E5EA",
  chartBaseBar: "rgba(0,0,0,0.08)",
  highlight: "#007AFF",
  dot: "#000000",
} as const;

export const cohereBg = {
  fallbackGradient:
    "radial-gradient(circle at 30% 30%, #32ADE6 0%, transparent 40%), radial-gradient(circle at 80% 20%, #FF3B30 0%, transparent 50%), radial-gradient(circle at 50% 80%, #FFCC00 0%, transparent 60%)",
  fallbackColor: "#F0F4F8",
  blur: "blur(100px)",
} as const;

// ============================================================
// Typography
// ============================================================
export const typography = {
  fontFamily: "Inter, sans-serif",
  letterSpacing: "0.02em",
  weights: { regular: 400, medium: 500, semibold: 600 } as const,
} as const;

export const cohereTypography = {
  heading: {
    fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
    letterSpacing: "-0.03em",
    lineHeight: 1.05,
    weights: { medium: 500, semibold: 600 },
  },
  body: {
    fontFamily: "Inter, sans-serif",
    letterSpacing: "0em",
    lineHeight: 1.3,
    weights: { regular: 400 },
  },
  mono: {
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0em",
    lineHeight: 1.4,
    weights: { regular: 400 },
  },
} as const;

// ============================================================
// Radii & layout
// ============================================================
export const radii = {
  lg: 24,
  md: 16,
  pill: 999,
} as const;

export const layout = {
  centerMaxWidth: 1152, // 60vw at 1920
  splitGap: 64,
  splitPadding: "96px 120px",
  splitColumns: "4fr 6fr",
  staggerFast: 6,
  staggerNormal: 10,
  staggerSlow: 12,
} as const;

// ============================================================
// Glow (existing)
// ============================================================
export const glow = {
  panel: (intensity = 1) => `0 0 ${40 * intensity}px rgba(0, 245, 212, ${0.15 * intensity})`,
  text: (intensity = 1) => `0 0 ${15 * intensity}px rgba(0, 245, 212, ${0.4 * intensity})`,
  orbit: "0 0 20px rgba(0, 245, 212, 0.2)",
} as const;
