import { loadFont } from "@remotion/google-fonts/Inter";

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

// Plus Jakarta Sans — geometric heading font (Google Fonts free alternative to commercial geometric typefaces)
// Loaded via <link> in Root.tsx with Remotion delayRender/continueRender pattern.
// JetBrains Mono — loaded via <link> for code/code-block scenes.
