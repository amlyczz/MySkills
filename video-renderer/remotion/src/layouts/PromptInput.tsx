/**
 * PromptInput — AI 对话模拟布局。
 *
 * 对标 Google Flow 0:22 的富文本内联实体胶囊：
 * 输入框内 @mention 渲染为带缩略图的 Pill 组件。
 *
 * Props: rawPrompt + entities 映射表（从 content 解析）
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Img, Video } from "remotion";
import { LayoutProps } from "../types";
import { FONT_SIZE_TITLE, FONT_WEIGHT_TITLE } from "../layout";

interface EntityDef {
  type: string;
  name: string;
  thumb?: string;
}

export const PromptInput: React.FC<LayoutProps> = ({
  title,
  subtitle,
  style,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Parse: title = rawPrompt, subtitle = JSON entities string
  const rawPrompt = (title as string) || "";
  let entities: Record<string, EntityDef> = {};
  try {
    entities = JSON.parse((subtitle as string) || "{}");
  } catch {}

  // Split rawPrompt by {entity} placeholders
  const parts = rawPrompt.split(/(\{[^}]+\})/g);

  return (
    <AbsoluteFill
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: theme.typography.fontFamily, padding: 80,
      }}
    >
      <div
        style={{
          background: `rgba(255,255,255,${style.glassOpacity ?? 0.06})`,
          backdropFilter: `blur(${style.backdropBlur ?? 16}px)`,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.2)",
          padding: "32px 48px",
          maxWidth: 900,
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
          fontSize: FONT_SIZE_TITLE * 0.6,
          fontWeight: FONT_WEIGHT_TITLE,
          color: style.bodyColor,
        }}
      >
        {parts.map((part, i) => {
          // Check if this is an entity placeholder
          const match = part.match(/^\{([^}]+)\}$/);
          if (match) {
            const entity = entities[match[1]];
            if (!entity) return <span key={i}>{match[1]}</span>;

            const staggerDelay = i * 10;
            const activeFrame = Math.max(0, frame - staggerDelay);
            const progress = spring({
              frame: activeFrame, fps,
              config: { damping: 14, stiffness: 100, mass: 0.7 },
            });
            const scale = interpolate(progress, [0, 1], [0.5, 1]);
            const opacity = interpolate(progress, [0, 1], [0, 1]);

            const isVideo = entity.thumb?.endsWith(".mp4") || entity.thumb?.endsWith(".webm");

            return (
              <span
                key={i}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: `rgba(66,133,244,0.2)`,
                  borderRadius: 12, padding: "6px 14px",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(66,133,244,0.3)",
                  opacity, transform: `scale(${scale})`,
                }}
              >
                {entity.thumb && (
                  isVideo ? (
                    <Video src={entity.thumb} style={{ width: 28, height: 28, borderRadius: 6 }} />
                  ) : (
                    <Img src={entity.thumb} style={{ width: 28, height: 28, borderRadius: 6 }} />
                  )
                )}
                <span style={{ color: "#8ab4f8" }}>@{entity.name}</span>
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}

        {/* Blinking cursor */}
        <span
          style={{
            display: "inline-block", width: 3, height: "0.6em",
            backgroundColor: style.bodyColor,
            opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
