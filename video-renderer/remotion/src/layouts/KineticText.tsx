/**
 * KineticText — 动态排印状态机布局。
 *
 * 对标 Chrome Skills 的文字交互效果：
 * 打字 → 高亮选中 → 删除 → 替换新词。
 *
 * Props: baseText + actionSequence
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { LayoutProps } from "../types";
import { FONT_SIZE_TITLE, FONT_WEIGHT_TITLE } from "../layout";

interface KineticAction {
  type: "type" | "highlight" | "delete";
  text?: string;
  color?: string;
  frames: number;
}

export const KineticText: React.FC<LayoutProps> = ({
  title,
  subtitle,
  style,
  theme,
}) => {
  const frame = useCurrentFrame();

  // Parse actionSequence from content
  const baseText = (title as string) || "";
  const actions = ((subtitle as unknown) as KineticAction[]) || [];

  // Calculate cumulative frames to track which action is active
  let cursor = 0;
  let activeAction: KineticAction | null = null;
  let actionStart = 0;
  let actionProgress = 0;

  for (const action of actions) {
    if (frame >= cursor && frame < cursor + action.frames) {
      activeAction = action;
      actionStart = cursor;
      actionProgress = (frame - cursor) / action.frames;
      break;
    }
    cursor += action.frames;
  }

  const displayedText = computeDisplayText(baseText, actions, frame);
  const highlightColor = activeAction?.type === "highlight"
    ? activeAction.color || "#1A73E8"
    : "transparent";
  const highlightWidth = activeAction?.type === "highlight"
    ? `${actionProgress * 100}%`
    : "0%";
  const textColor = activeAction?.type === "highlight"
    ? interpolate(frame, [actionStart + actionStart * 0.3, actionStart + actionStart * 0.6], ["#fff", "#000"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : "#fff";

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: theme.typography.fontFamily,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: FONT_SIZE_TITLE, fontWeight: FONT_WEIGHT_TITLE }}>
        <span style={{ color: style.bodyColor }}>{baseText}&nbsp;</span>
        <span style={{ position: "relative", display: "inline-block" }}>
          {/* Highlight overlay */}
          <span
            style={{
              position: "absolute", top: 0, left: 0,
              height: "100%", width: highlightWidth,
              backgroundColor: highlightColor,
              zIndex: 0, borderRadius: 4,
            }}
          />
          {/* Text */}
          <span style={{ position: "relative", zIndex: 1, color: activeAction?.type === "highlight" ? textColor : style.bodyColor }}>
            {displayedText}
          </span>
          {/* Blinking cursor */}
          {(activeAction?.type === "type" || !activeAction) && (
            <span
              style={{
                display: "inline-block", width: 3, height: "0.7em",
                backgroundColor: style.bodyColor,
                marginLeft: 2, verticalAlign: "middle",
                opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
              }}
            />
          )}
        </span>
      </div>
    </AbsoluteFill>
  );
};

function computeDisplayText(base: string, actions: KineticAction[], frame: number): string {
  let cursor = 0;
  let text = "";

  for (const action of actions) {
    const progress = Math.min(1, Math.max(0, (frame - cursor) / action.frames));

    if (action.type === "type") {
      const word = action.text || "";
      if (frame < cursor) break;
      const chars = Math.floor(progress * word.length);
      text = word.substring(0, chars);
    } else if (action.type === "highlight") {
      if (frame < cursor) break;
      // Keep previous text during highlight
    } else if (action.type === "delete") {
      if (frame < cursor) break;
      const remaining = Math.max(0, text.length - Math.floor(progress * text.length));
      text = text.substring(0, remaining);
    }

    cursor += action.frames;
  }

  return text;
}
