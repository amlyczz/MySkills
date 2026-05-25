import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { componentRegistry } from "./registries/componentRegistry";
import { DEFAULT_FPS } from "./engine/constants";

// Minimal sample props for each component so it renders something visible
const sampleProps: Record<string, Record<string, unknown>> = {
  // ── Layout ──
  "browser-mockup": { children: null },
  "center-layout": { children: null },
  "coverflow-carousel": { children: [], cardWidth: 400, scrollSpeed: 55 },
  "horizontal-carousel": { cards: [{ title: "Card 1", description: "A sample card" }, { title: "Card 2", description: "Another card" }] },
  "iphone-frame": { children: null },
  "layered-element": { depth: 0, delay: 0, startFrame: 0, children: null },
  "pop-up-book-base": { startFrame: 0, children: null },
  "floating-card": { children: null, glow: true, rotX: 5, rotY: -5 },
  "icon-grid": { items: [{ icon: "🐛", label: "Bug Fixer", subtitle: "Fixes issues", color: "#E8F2FF" }, { icon: "📅", label: "Calendar", color: "#FFE8F2" }], columns: 2 },
  "pricing-stack": { children: null },
  "split-layout": { children: null },
  "split-media": { mediaSrc: "https://picsum.photos/800/600", mediaType: "image", children: null },

  // ── Content ──
  "ai-summary-box": { title: "Summary", text: "This is an AI-generated summary.", cards: [{ label: "Item A", desc: "Description A", color: "#DBEAFE" }] },
  "agent-card": { name: "Agent", task: "Research", status: "active" },
  "album-card": { title: "Album", artist: "Artist", color: "#E8115B" },
  "animated-bar": { label: "Speed", endValue: 78, maxValue: 100, isHighlight: true },
  "animated-text": { text: "Hello World", preset: "fadeUp" },
  "cta-button": { label: "Get Started", variant: "filled", size: "md" },
  "data-bar-chart": { data: [{ label: "A", value: 80 }, { label: "B", value: 60 }, { label: "C", value: 40 }], maxValue: 100 },
  "experiment-card": { title: "Experiment", description: "An AI experiment.", imageColor: "#FFD54F", accentColor: "#E8A80C" },
  "filter-pills": { items: ["All", "Design", "Code", "Music"], activeIndex: 0, startFrame: 0 },
  "flow-music-card": {},
  "generating-pill": {},
  "ios-list-item": { icon: "🐛", title: "Bug Fixer", subtitle: "Fixes code issues", iconBg: "#E8F2FF" },
  "ios-nav-bar": { tabs: ["All", "Productivity"], activeTab: 0 },
  "ios-status-bar": {},
  "lower-third": { name: "Jane Smith", subtitle: "CEO, Acme Corp", position: "bottom-left" },
  "memphis-card": { name: "Demo User", role: "Tester", text: "Looks great!", theme: "blue" },
  "minimal-card": { children: null },
  "mock-ui-card": { children: null, type: "chat", elevation: 1 },
  "number-counter": { value: 12847, prefix: "", suffix: " steps", decimals: 0 },
  "pricing-card": { data: { title: "Pro", slogan: "For professionals", features: ["Feature A", "Feature B"], price: "$29/mo", accentColor: "#60A5FA" } },
  "product-card": { title: "Product", description: "A great product" },
  "progress-ring": {},
  "prompt-input": { text: "Type your prompt here...", startFrame: 0 },
  "quote-card": { quote: "The best way to predict the future is to create it.", author: "Peter Drucker", role: "Author" },
  "search-bar": { query: "Search something...", typingSpeed: 100 },
  "stat-card": { value: "12.5K", label: "Active Users", accentColor: "#4285F4" },
  "subtitle-overlay": { tokens: [{ text: "Hello ", fromFrame: 0, toFrame: 30 }, { text: "World", fromFrame: 30, toFrame: 60 }], highlightColor: "#39E508" },
  "text-block": { en: "Hello World", jp: "こんにちは", color: "#4285F4" },
  "title": { text: "Build the Future", level: "h1", subtitle: "One component at a time" },
  "typing-input": { text: "Typing animation demo...", startFrame: 0 },
  "typewriter": { text: "Typewriter effect demo", startFrame: 0 },
  "ui-card": { children: null, bgColor: "#FFF" },
  "video-card": { title: "Video Title", channel: "Channel", views: "1M", time: "1 week ago", thumbnailColor: "#DBEAFE" },
  "word-swap-headline": { prefix: "We", words: ["build", "design", "ship"], framePerWord: 45 },

  // ── Decoration ──
  "aurora-bg": {},
  "badge": { text: "React", variant: "solid", size: "md" },
  "connection-line": { startX: 100, startY: 100, endX: 500, endY: 500 },
  "cursor": { path: [[0, 100, 100], [30, 300, 200], [60, 500, 100]] },
  "decoration-overlay": {},
  "diagonal-wipe-transition": { startFrame: 0, color: "#FF3399" },
  "dot-grid-bg": {},
  "fluid-background": {},
  "graphic-overlay": {},
  "ken-burns": { src: "https://picsum.photos/1920/1080", durationFrames: 300 },
  "noise-background": {},
  "organic-blob": { color: "#4285F4", size: 400 },
  "realistic-sphere": {},
  "scene-canvas": { themeColor: "#4285F4", children: null },
};

const entryList = Object.keys(componentRegistry).sort();

const Label: React.FC<{ name: string; layer: string }> = ({ name, layer }) => (
  <div className="absolute top-8 left-8 z-50 font-sans flex items-baseline gap-3">
    <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-white/60 border border-white/20">{layer}</span>
    <span className="text-2xl font-bold text-white">{name}</span>
  </div>
);

const layerOf = (name: string): string => {
  const layout = ["browser-mockup", "center-layout", "coverflow-carousel", "floating-card", "horizontal-carousel", "icon-grid", "iphone-frame", "layered-element", "pop-up-book-base", "pricing-stack", "split-layout", "split-media"];
  const decoration = ["aurora-bg", "badge", "connection-line", "cursor", "decoration-overlay", "diagonal-wipe-transition", "dot-grid-bg", "fluid-background", "graphic-overlay", "ken-burns", "noise-background", "organic-blob", "realistic-sphere", "scene-canvas"];
  if (layout.includes(name)) return "layout";
  if (decoration.includes(name)) return "decoration";
  return "content";
};

const FRAMES_PER = 90; // 3 seconds @ 30fps

const ComponentSlot: React.FC<{ type: string; layer: string }> = ({ type, layer }) => {
  const frame = useCurrentFrame(); // local frame inside Sequence
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [FRAMES_PER - 10, FRAMES_PER], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const Component = componentRegistry[type];
  const props = sampleProps[type] ?? {};

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <Label name={type} layer={layer} />
      <AbsoluteFill className="flex items-center justify-center">
        <Component {...(props as any)} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ComponentCatalog: React.FC = () => (
  <AbsoluteFill className="bg-[#0f0f0f]">
    {entryList.map((type, i) => (
      <Sequence key={type} from={i * FRAMES_PER} durationInFrames={FRAMES_PER} premountFor={FRAMES_PER}>
        <ComponentSlot type={type} layer={layerOf(type)} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

// Helper for Root.tsx to know total duration
export const catalogTotalFrames = (): number => entryList.length * FRAMES_PER;
