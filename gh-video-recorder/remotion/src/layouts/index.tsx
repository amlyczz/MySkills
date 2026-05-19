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
    case "split-right-text":
    case "full-screen-text":
    default:
      return <HeroCenter {...props} />;
  }
};
