import type { Blueprint } from "../engine/types";

export const searchDemoBlueprint: Blueprint = {
  meta: {
    id: "search-demo",
    name: "AI Search Demo",
  },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#3B82F6", // blue-500
        background: "#09090b", // zinc-950
        surface: "#18181b", // zinc-900
        foreground: "#ffffff",
      },
      typography: {
        primaryFont: "Inter",
        scales: {
          h1: "48px",
          body: "16px",
        }
      },
      shape: {
        radii: {
          sm: "4px",
          md: "8px",
          lg: "16px",
          xl: "24px",
        },
        shadows: {
          sm: "0 1px 2px rgba(0,0,0,0.1)",
          md: "0 4px 6px rgba(0,0,0,0.1)",
        }
      }
    }
  },
  globalBackground: {
    type: "none",
  },
  scenes: [
    {
      id: "scene-1",
      type: "generic",
      startFrame: 0,
      durationInFrames: 150, // 5 seconds
      elements: [
        {
          id: "layout",
          type: "split-layout",
          children: [
            {
              id: "left-text",
              type: "text-block",
              props: {
                en: "The future of search is conversational.",
                jp: "検索の未来は対話型です",
                color: "var(--color-primary)",
              },
              animation: {
                type: "fade-up",
                timeline: { inFrame: 15 },
              }
            },
            {
              id: "right-mockup",
              type: "browser-mockup",
              children: [
                {
                  id: "mockup-content",
                  type: "text",
                  props: { text: "Search results...", color: "black", fontSize: "24px" }
                }
              ],
              animation: {
                type: "scale-bounce",
                timeline: { inFrame: 30 },
              }
            }
          ]
        }
      ]
    }
  ]
};
