/**
 * layouts/index.tsx — 布局类型 + 调度器。
 *
 * 根据 LayoutType 选择对应的布局组件渲染。
 */
import React from "react";
import { LayoutType, LayoutProps } from "../types";
import { HeroCenter } from "./HeroCenter";
import { SplitLeftText } from "./SplitLeftText";
import { MediaFull } from "./MediaFull";
import { StatHighlight } from "./StatHighlight";
import { CardGrid } from "./CardGrid";
import { QuoteStyle } from "./QuoteStyle";
import { CodeDisplay } from "./CodeDisplay";
import { SandwichText } from "./SandwichText";
import { CenterFocusVideo } from "./CenterFocusVideo";
import { FloatingGrid } from "./FloatingGrid";
import { KineticText } from "./KineticText";
import { ZAxisFlyThrough } from "./ZAxisFlyThrough";
import { PromptInput } from "./PromptInput";
import { FullScreenText } from "./FullScreenText";
import { MediaGallery } from "./MediaGallery";
import { CodeCarousel } from "./CodeCarousel";

export type { LayoutType };
export type { LayoutProps };

interface LayoutDispatcherProps extends LayoutProps {
  layoutId: LayoutType;
}

export const LayoutDispatcher: React.FC<LayoutDispatcherProps> = ({
  layoutId,
  ...props
}) => {
  switch (layoutId) {
    case "hero-center":
      return <HeroCenter {...props} />;
    case "split-left-text":
      return <SplitLeftText {...props} />;
    case "media-full":
      return <MediaFull {...props} />;
    case "stat-highlight":
      return <StatHighlight {...props} />;
    case "card-grid":
      return <CardGrid {...props} />;
    case "quote-style":
      return <QuoteStyle {...props} />;
    case "code-display":
      return <CodeDisplay {...props} />;
    case "sandwich-text":
      return <SandwichText {...props} />;
    case "center-focus-video":
      return <CenterFocusVideo {...props} />;
    case "kinetic-typography":
      return <KineticText {...props} />;
    case "floating-grid":
      return <FloatingGrid {...props} />;
    case "fly-through":
      return <ZAxisFlyThrough {...props} />;
    case "prompt-input":
      return <PromptInput {...props} />;
    case "split-right-text":
      return <SplitLeftText direction="right" {...props} />;
    case "full-screen-text":
      return <FullScreenText {...props} />;
    case "media-gallery":
      return <MediaGallery {...props} />;
    case "code-carousel":
      return <CodeCarousel {...props} />;
    default:
      return assertNever(layoutId);
  }
};

/** TypeScript exhaustive check helper */
function assertNever(x: never): never {
  throw new Error(`Unknown layoutId: ${x}`);
}
