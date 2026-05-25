import type React from "react";
import { AISummaryBox } from "../components/content/AISummaryBox";
import { AgentCard } from "../components/content/AgentCard";
import { AlbumCard } from "../components/content/AlbumCard";
import { AnimatedBar } from "../components/content/AnimatedBar";
import { AnimatedText } from "../components/content/AnimatedText";
import { CalloutBox } from "../components/content/CalloutBox";
import { ChapterTitle } from "../components/content/ChapterTitle";
import { CodeBlock } from "../components/content/CodeBlock";
import { ComparisonTable } from "../components/content/ComparisonTable";
import { CtaButton } from "../components/content/CtaButton";
import { DataBarChart } from "../components/content/DataBarChart";
import { ExperimentCardLight } from "../components/content/ExperimentCardLight";
import { KeyPoint } from "../components/content/KeyPoint";
import { FilterPills } from "../components/content/FilterPills";
import { FloatingCard } from "../components/layout/FloatingCard";
import { FlowMusicCard } from "../components/content/FlowMusicCard";
import { GeneratingPill } from "../components/content/GeneratingPill";
import { GradientText } from "../components/content/GradientText";
import { IOSListItem } from "../components/content/IOSListItem";
import { IOSNavBar } from "../components/content/IOSNavBar";
import { IOSStatusBar } from "../components/content/IOSStatusBar";
import { LowerThird } from "../components/content/LowerThird";
import { LuxuryCard } from "../components/content/LuxuryCard";
import { MemphisCard } from "../components/content/MemphisCard";
import { MinimalCard } from "../components/content/MinimalCard";
import { MockUICard } from "../components/content/MockUICard";
import { NumberCounter } from "../components/content/NumberCounter";
import { PricingCard } from "../components/content/PricingCard";
import { ProductCard } from "../components/content/ProductCard";
import { ProgressRing } from "../components/content/ProgressRing";
import { PromptInput } from "../components/content/PromptInput";
import { QuoteCard } from "../components/content/QuoteCard";
import { RevealMask } from "../components/content/RevealMask";
import { SearchBar } from "../components/content/SearchBar";
import { StaggerReveal } from "../components/content/StaggerReveal";
import { StepIndicator } from "../components/content/StepIndicator";
import { StatCard } from "../components/content/StatCard";
import { SubtitleOverlay } from "../components/content/SubtitleOverlay";
import { TextBlock } from "../components/content/TextBlock";
import { Title } from "../components/content/Title";
import { TypingInput } from "../components/content/TypingInput";
import { Typewriter } from "../components/content/Typewriter";
import { UICard } from "../components/content/UICard";
import { VideoCard } from "../components/content/VideoCard";
import { WordSwapHeadline } from "../components/content/WordSwapHeadline";
import { BrowserMockup } from "../components/layout/BrowserMockup";
import { CenterLayout } from "../components/layout/CenterLayout";
import { CoverflowCarousel } from "../components/layout/CoverflowCarousel";
import { HorizontalCarousel } from "../components/layout/HorizontalCarousel";
import { IconGrid } from "../components/layout/IconGrid";
import { IPhoneFrame } from "../components/layout/IPhoneFrame";
import { LayeredElement } from "../components/layout/LayeredElement";
import { PopUpBookBase } from "../components/layout/PopUpBookBase";
import { PricingStack } from "../components/layout/PricingStack";
import { SplitLayout } from "../components/layout/SplitLayout";
import { SplitMedia } from "../components/layout/SplitMedia";
import { AuroraBg } from "../components/decoration/AuroraBg";
import { Badge } from "../components/decoration/Badge";
import { CinematicBars } from "../components/decoration/CinematicBars";
import { ConnectionLine } from "../components/decoration/ConnectionLine";
import { Cursor } from "../components/decoration/Cursor";
import { DecorationOverlay } from "../components/decoration/DecorationOverlay";
import { DiagonalWipeTransition } from "../components/decoration/DiagonalWipeTransition";
import { DotGridBg } from "../components/decoration/DotGridBg";
import { FilmGrain } from "../components/decoration/FilmGrain";
import { FluidBackground } from "../components/decoration/FluidBackground";
import { GlassPanel } from "../components/decoration/GlassPanel";
import { GraphicOverlay } from "../components/decoration/GraphicOverlay";
import { KenBurns } from "../components/decoration/KenBurns";
import { MeshGradientBg } from "../components/decoration/MeshGradientBg";
import { NoiseBackground } from "../components/decoration/NoiseBackground";
import { OrganicBlob } from "../components/decoration/OrganicBlob";
import { RealisticSphere } from "../components/decoration/RealisticSphere";
import { SceneCanvas } from "../components/decoration/SceneCanvas";
import type { ComponentType } from "../engine/types";

type RegisteredComponentType = Exclude<ComponentType, "text" | "image" | "video" | "shape" | "div" | "lottie">;

export const componentRegistry: Record<string, React.FC<any>> = {
  // ── Content ──
  "ai-summary-box": AISummaryBox, "agent-card": AgentCard, "album-card": AlbumCard,
  "animated-bar": AnimatedBar, "animated-text": AnimatedText, "callout-box": CalloutBox,
  "chapter-title": ChapterTitle, "code-block": CodeBlock, "comparison-table": ComparisonTable,
  "cta-button": CtaButton, "data-bar-chart": DataBarChart, "experiment-card": ExperimentCardLight,
  "filter-pills": FilterPills, "flow-music-card": FlowMusicCard, "generating-pill": GeneratingPill,
  "gradient-text": GradientText, "ios-list-item": IOSListItem, "ios-nav-bar": IOSNavBar,
  "ios-status-bar": IOSStatusBar, "key-point": KeyPoint, "lower-third": LowerThird,
  "luxury-card": LuxuryCard, "memphis-card": MemphisCard, "minimal-card": MinimalCard,
  "mock-ui-card": MockUICard, "number-counter": NumberCounter, "pricing-card": PricingCard,
  "product-card": ProductCard, "progress-ring": ProgressRing, "prompt-input": PromptInput,
  "quote-card": QuoteCard, "reveal-mask": RevealMask, "search-bar": SearchBar,
  "stagger-reveal": StaggerReveal, "stat-card": StatCard, "step-indicator": StepIndicator,
  "subtitle-overlay": SubtitleOverlay, "text-block": TextBlock, "title": Title,
  "typing-input": TypingInput, "typewriter": Typewriter, "ui-card": UICard,
  "video-card": VideoCard, "word-swap-headline": WordSwapHeadline,
  // ── Layout ──
  "browser-mockup": BrowserMockup, "center-layout": CenterLayout,
  "coverflow-carousel": CoverflowCarousel, "floating-card": FloatingCard,
  "horizontal-carousel": HorizontalCarousel, "icon-grid": IconGrid,
  "iphone-frame": IPhoneFrame, "layered-element": LayeredElement,
  "pop-up-book-base": PopUpBookBase, "pricing-stack": PricingStack,
  "split-layout": SplitLayout, "split-media": SplitMedia,
  // ── Decoration ──
  "badge": Badge, "cinematic-bars": CinematicBars,
  "connection-line": ConnectionLine, "cursor": Cursor, "decoration-overlay": DecorationOverlay,
  "diagonal-wipe-transition": DiagonalWipeTransition, "dot-grid-bg": DotGridBg,
  "film-grain": FilmGrain, "fluid-background": FluidBackground, "glass-panel": GlassPanel,
  "graphic-overlay": GraphicOverlay, "ken-burns": KenBurns, "mesh-gradient-bg": MeshGradientBg,
  "noise-background": NoiseBackground, "organic-blob": OrganicBlob,
  "realistic-sphere": RealisticSphere, "scene-canvas": SceneCanvas,
};
