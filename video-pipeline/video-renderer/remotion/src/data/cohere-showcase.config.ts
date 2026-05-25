import type { SceneType } from "../scenes";
import type { DecorationType } from "../components/decoration/DecorationOverlay";

// ============================================================
// Cohere Command A+ Showcase — Single Source of Truth
// ============================================================

export interface SceneConfig {
  type: SceneType;
  from: number; // start frame (at 24fps)
  duration: number; // duration in frames
  props: Record<string, unknown>;
}

export interface ShowcaseConfig {
  fps: number;
  totalFrames: number;
  scenes: SceneConfig[];
}

const FPS = 24;

export const cohereConfig: ShowcaseConfig = {
  fps: FPS,
  totalFrames: 840,

  scenes: [
    // S6 — 0:00–0:07 (168 frames)
    {
      type: "SplitDataChartScene",
      from: 0,
      duration: FPS * 7,
      props: {
        leftLines: [
          { text: "Blazing fast" },
          { text: "output speeds with low latency." },
        ],
        chartData: [
          { label: "Output Tokens/s", value: 156, maxValue: 200 },
          { label: "TTFT (seconds)", value: 0.18, maxValue: 1 },
        ],
        showComparison: false,
        isHighlight: true,
        chartStaggerDelay: 10,
        bgIntensity: 0.06,
      },
    },,

    // S8 — 0:07–0:20 (312 frames)
    {
      type: "SplitUIMockupScene",
      from: 168,
      duration: FPS * 13,
      props: {
        leftLines: ["One model.", "Every capability."],
        cards: [
          {
            icon: "A",
            title: "Agents",
            desc: "Multi-step tool use with autonomous reasoning and planning.",
            extraDelay: 0,
          },
          {
            icon: "V",
            title: "Vision",
            desc: "Analyze images, charts, and documents with high accuracy.",
            extraDelay: 15,
          },
          {
            icon: "R",
            title: "Reasoning",
            desc: "Chain-of-thought reasoning for complex problem solving.",
            extraDelay: 30,
          },
        ],
        cardStagger: 0,
        bgIntensity: 0.06,
      },
    },

    // S9 — 0:20–0:29 (216 frames)
    {
      type: "ScrollingGraphicScene",
      from: 480,
      duration: FPS * 9,
      props: {
        headline: "Built for the ecosystem",
        layoutMode: "grid",
        columns: 3,
        items: [
          { label: "23 languages", icon: "🌐" },
          { label: "Google Drive", icon: "📁" },
          { label: "Slack & Teams", icon: "💬" },
          { label: "JSON output", icon: "{ }" },
          { label: "Tool calling", icon: "🔧" },
          { label: "Streaming", icon: "⚡" },
        ],
        bgIntensity: 0.05,
      },
    },

    // S10 — 0:29–0:35 (144 frames)
    {
      type: "CoherenOutroScene",
      from: 696,
      duration: FPS * 6,
      props: {
        title: "Own your AI.",
      },
    },
  ],
};
