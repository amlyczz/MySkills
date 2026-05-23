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

export const typography = {
  fontFamily: "Inter, sans-serif",
  letterSpacing: "0.02em",
  weights: { regular: 400, medium: 500, semibold: 600 } as const,
} as const;

export const radii = {
  lg: 24,
  md: 16,
  pill: 999,
} as const;

export const glow = {
  panel: (intensity = 1) => `0 0 ${40 * intensity}px rgba(0, 245, 212, ${0.15 * intensity})`,
  text: (intensity = 1) => `0 0 ${15 * intensity}px rgba(0, 245, 212, ${0.4 * intensity})`,
  orbit: "0 0 20px rgba(0, 245, 212, 0.2)",
} as const;
