import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadSpace } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansSC";

export const { fontFamily: interFont } = loadFont("normal", {
  weights: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const { fontFamily: spaceFont } = loadSpace("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export const { fontFamily: playfairFont } = loadPlayfair("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin"],
});

export const { fontFamily: monoFont } = loadMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export const { fontFamily: notoFont } = loadNoto("normal", {
  weights: ["400", "500", "700"],
  subsets: ["chinese-simplified", "latin"],
});

export const fontFamily = interFont;
