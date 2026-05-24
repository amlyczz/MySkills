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
import { IOSListItem } from "../components/content/IOSListItem";
import { IOSNavBar } from "../components/content/IOSNavBar";
import { IOSStatusBar } from "../components/content/IOSStatusBar";
import { LowerThird } from "../components/content/LowerThird";
import { MemphisCard } from "../components/content/MemphisCard";
import { MinimalCard } from "../components/content/MinimalCard";
import { MockUICard } from "../components/content/MockUICard";
import { NumberCounter } from "../components/content/NumberCounter";
import { PricingCard } from "../components/content/PricingCard";
import { ProductCard } from "../components/content/ProductCard";
import { ProgressRing } from "../components/content/ProgressRing";
import { PromptInput } from "../components/content/PromptInput";
import { QuoteCard } from "../components/content/QuoteCard";
import { SearchBar } from "../components/content/SearchBar";
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
import { SceneCanvas } from "../components/decoration/SceneCanvas";
import { SplitLayout } from "../components/layout/SplitLayout";
import { SplitMedia } from "../components/layout/SplitMedia";
import { AuroraBg } from "../components/decoration/AuroraBg";
import { Badge } from "../components/decoration/Badge";
import { ConnectionLine } from "../components/decoration/ConnectionLine";
import { Cursor } from "../components/decoration/Cursor";
import { DecorationOverlay } from "../components/decoration/DecorationOverlay";
import { DiagonalWipeTransition } from "../components/decoration/DiagonalWipeTransition";
import { DotGridBg } from "../components/decoration/DotGridBg";
import { FluidBackground } from "../components/decoration/FluidBackground";
import { GraphicOverlay } from "../components/decoration/GraphicOverlay";
import { KenBurns } from "../components/decoration/KenBurns";
import { NoiseBackground } from "../components/decoration/NoiseBackground";
import { OrganicBlob } from "../components/decoration/OrganicBlob";
import { RealisticSphere } from "../components/decoration/RealisticSphere";
import type { ComponentType } from "../engine/types";

type RegisteredComponentType = Exclude<ComponentType, "text" | "image" | "video" | "shape" | "div">;

export const componentRegistry: Record<RegisteredComponentType, React.FC<any>> = {
  // ── Content ──
  "ai-summary-box": AISummaryBox,
  "agent-card": AgentCard,
  "album-card": AlbumCard,
  "animated-bar": AnimatedBar,
  "animated-text": AnimatedText,
  "callout-box": CalloutBox,
  "chapter-title": ChapterTitle,
  "code-block": CodeBlock,
  "comparison-table": ComparisonTable,
  "cta-button": CtaButton,
  "data-bar-chart": DataBarChart,
  "experiment-card": ExperimentCardLight,
  "filter-pills": FilterPills,
  "floating-card": FloatingCard,
  "flow-music-card": FlowMusicCard,
  "generating-pill": GeneratingPill,
  "ios-list-item": IOSListItem,
  "key-point": KeyPoint,
  "ios-nav-bar": IOSNavBar,
  "ios-status-bar": IOSStatusBar,
  "lower-third": LowerThird,
  "memphis-card": MemphisCard,
  "minimal-card": MinimalCard,
  "mock-ui-card": MockUICard,
  "number-counter": NumberCounter,
  "pricing-card": PricingCard,
  "product-card": ProductCard,
  "progress-ring": ProgressRing,
  "prompt-input": PromptInput,
  "quote-card": QuoteCard,
  "search-bar": SearchBar,
  "stat-card": StatCard,
  "step-indicator": StepIndicator,
  "subtitle-overlay": SubtitleOverlay,
  "text-block": TextBlock,
  "title": Title,
  "typing-input": TypingInput,
  "typewriter": Typewriter,
  "ui-card": UICard,
  "video-card": VideoCard,
  "word-swap-headline": WordSwapHeadline,

  // ── Layout ──
  "browser-mockup": BrowserMockup,
  "center-layout": CenterLayout,
  "coverflow-carousel": CoverflowCarousel,
  "horizontal-carousel": HorizontalCarousel,
  "icon-grid": IconGrid,
  "iphone-frame": IPhoneFrame,
  "layered-element": LayeredElement,
  "pop-up-book-base": PopUpBookBase,
  "pricing-stack": PricingStack,
  "scene-canvas": SceneCanvas,
  "split-layout": SplitLayout,
  "split-media": SplitMedia,

  // ── Decoration ──
  "aurora-bg": AuroraBg,
  "badge": Badge,
  "connection-line": ConnectionLine,
  "cursor": Cursor,
  "decoration-overlay": DecorationOverlay,
  "diagonal-wipe-transition": DiagonalWipeTransition,
  "dot-grid-bg": DotGridBg,
  "fluid-background": FluidBackground,
  "graphic-overlay": GraphicOverlay,
  "ken-burns": KenBurns,
  "noise-background": NoiseBackground,
  "organic-blob": OrganicBlob,
  "realistic-sphere": RealisticSphere,
};
