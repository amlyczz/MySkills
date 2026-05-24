import React, { useEffect, useState } from "react";
import { useCurrentFrame, useVideoConfig, Img, cancelRender, continueRender, delayRender } from "remotion";
import { Video } from "@remotion/media";
import type { ElementConfig, MotionToken } from "./types";
import { componentRegistry } from "../registries/componentRegistry";
import { applyAnimation } from "./applyAnimation";
import { evalCondition, resolveDataRefs } from "./types";

// ── Lottie sub-renderer ──
let LottieModule: any = null;

const LottieElement: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => {
  const [animationData, setAnimationData] = useState<any>(null);
  const [handle] = useState(() => delayRender("Loading Lottie"));

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((res) => res.json())
      .then(async (json) => {
        if (cancelled) return;
        if (!LottieModule) {
          try {
            LottieModule = await import("@remotion/lottie");
          } catch {
            console.warn("[ElementRenderer] @remotion/lottie not installed.");
            continueRender(handle);
            return;
          }
        }
        setAnimationData(json);
        continueRender(handle);
      })
      .catch((err) => { cancelRender(err); });
    return () => { cancelled = true; };
  }, [src]);

  if (!animationData || !LottieModule) return null;
  return <LottieModule.Lottie animationData={animationData} style={style} />;
};

interface Props {
  element: ElementConfig;
  /** Global data context for $data.xxx references and condition evaluation */
  dataCtx?: Record<string, unknown>;
  /** Global motion tokens */
  motionTokens?: Record<string, MotionToken>;
  /** Parent stagger offset (frames) — injected by parent ElementRenderer */
  staggerOffset?: number;
}

export const ElementRenderer: React.FC<Props> = ({ element, dataCtx = {}, motionTokens, staggerOffset = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Condition check ──
  if (!evalCondition(element.condition, dataCtx)) {
    return null;
  }

  // ── Resolve data references in props ──
  const resolvedProps = resolveDataRefs(element.props, dataCtx) as Record<string, unknown>;

  // ── Apply stagger to child config ──
  const animConfig = element.animation
    ? { ...element.animation }
    : undefined;
  if (animConfig && staggerOffset > 0) {
    animConfig.timeline = {
      ...animConfig.timeline,
      inFrame: (animConfig.timeline.inFrame ?? 0) + staggerOffset,
    };
  }

  // Compute entrance + loop animation styles
  const animStyle = applyAnimation(frame, fps, animConfig, motionTokens);

  // ── Static layout styles (baseline transform, no frame dependency) ──
  const layoutStyle: React.CSSProperties = {};
  if (element.layout) {
    const { position, x, y, width, height, zIndex, scale, rotation, opacity } = element.layout;
    if (position === "absolute") {
      layoutStyle.position = "absolute";
      if (x !== undefined) layoutStyle.left = x;
      if (y !== undefined) layoutStyle.top = y;
    }
    if (width !== undefined) layoutStyle.width = width;
    if (height !== undefined) layoutStyle.height = height;
    if (zIndex !== undefined) layoutStyle.zIndex = zIndex;
    // Static transform (always-on baseline)
    if (scale !== undefined || rotation !== undefined) {
      const parts: string[] = [];
      if (scale !== undefined && scale !== 1) parts.push(`scale(${scale})`);
      if (rotation !== undefined && rotation !== 0) parts.push(`rotate(${rotation}deg)`);
      if (parts.length > 0) layoutStyle.transform = parts.join(" ");
    }
    if (opacity !== undefined) layoutStyle.opacity = opacity;
  }

  // Merge raw style overrides
  if (element.style) {
    Object.assign(layoutStyle, element.style);
  }

  // ── Merge static transform with animation transform ──
  const mergedStyle: React.CSSProperties = { ...layoutStyle };
  if (animStyle.transform) {
    const base = mergedStyle.transform;
    mergedStyle.transform = base
      ? `${base} ${animStyle.transform as string}`
      : (animStyle.transform as string);
    delete (animStyle as any).transform;
  }
  Object.assign(mergedStyle, animStyle);

  // ── Render children with stagger ──
  const stagger = element.animation?.stagger;
  const renderedChildren = element.children?.map((child, i) => {
    const childOffset = stagger
      ? (stagger.direction === "reverse"
          ? (element.children!.length - 1 - i) * stagger.delayPerChild
          : i * stagger.delayPerChild)
      : 0;
    return (
      <ElementRenderer
        key={child.id}
        element={child}
        dataCtx={dataCtx}
        motionTokens={motionTokens}
        staggerOffset={childOffset}
      />
    );
  });

  // ── Resolve component ──
  let content: React.ReactNode;

  switch (element.type) {
    case "text":
      content = (
        <div style={{ fontFamily: "Inter, sans-serif", ...(resolvedProps as React.CSSProperties) }}>
          {(resolvedProps.text as string) ?? ""}
        </div>
      );
      break;

    case "image":
      content = (
        <Img
          src={resolvedProps.src as string}
          style={{
            width: element.layout?.width ?? "100%",
            height: element.layout?.height ?? "auto",
            objectFit: (resolvedProps.objectFit as any) ?? "cover",
          }}
        />
      );
      break;

    case "video":
      content = (
        <Video
          src={resolvedProps.src as string}
          style={{
            width: element.layout?.width ?? "100%",
            height: element.layout?.height ?? "auto",
            objectFit: (resolvedProps.objectFit as any) ?? "cover",
          }}
        />
      );
      break;

    case "shape":
      content = (
        <div style={{
          width: element.layout?.width ?? 100,
          height: element.layout?.height ?? 100,
          borderRadius: (resolvedProps.borderRadius as string) ?? "0",
          background: (resolvedProps.background as string) ?? "#ccc",
          ...(resolvedProps.style as React.CSSProperties),
        }} />
      );
      break;

    case "div":
      content = (
        <div style={resolvedProps.style as React.CSSProperties}>
          {renderedChildren}
        </div>
      );
      break;

    case "lottie":
      content = (
        <LottieElement
          src={resolvedProps.src as string}
          style={{ width: element.layout?.width ?? 300, height: element.layout?.height ?? 300 }}
        />
      );
      break;

    default: {
      const Component = (componentRegistry as Record<string, React.FC<any>>)[element.type];
      if (!Component) {
        console.warn(`[ElementRenderer] Unknown component type: "${element.type}".`);
        content = null;
        break;
      }
      content = <Component {...(resolvedProps ?? {})}>{renderedChildren}</Component>;
      break;
    }
  }

  return <div style={mergedStyle}>{content}</div>;
};
