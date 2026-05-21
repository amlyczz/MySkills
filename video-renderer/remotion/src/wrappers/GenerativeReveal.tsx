/**
 * GenerativeReveal — 多阶段生成态模拟 wrapper。
 *
 * 对标 Google Flow 0:45 的 AI 生成过程模拟：
 * Stage 1: 骨架屏（毛玻璃空卡片 + 微弱脉冲）
 * Stage 2: 进度数字递增（0% → 100%）
 * Stage 3: 图片出现但极度模糊
 * Stage 4: 瞬间清晰（spring blur 衰减）
 *
 * Props: stages 配置 + 最终内容 children
 */
import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface Stage {
  stage: "skeleton" | "progress" | "resolve";
  start?: number;
  end?: number;
  blurStart?: number;
  frames: number;
}

interface Props {
  stages: Stage[];
  children: React.ReactNode;
}

export const GenerativeReveal: React.FC<Props> = ({ stages, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let cursor = 0;
  let currentStage: string = "skeleton";
  let progress = 0;
  let blurPx = 0;
  let displayProgress = 0;

  for (const stage of stages) {
    if (frame >= cursor && frame < cursor + stage.frames) {
      currentStage = stage.stage;
      progress = (frame - cursor) / stage.frames;
      break;
    }
    cursor += stage.frames;
  }

  if (currentStage === "skeleton") {
    // Pulsing glass placeholder
    const pulse = Math.sin(frame * 0.1) * 0.5 + 0.5;
    blurPx = 0;
    displayProgress = 0;
  } else if (currentStage === "progress") {
    const stage = stages.find(s => s.stage === "progress");
    const start = stage?.start ?? 0;
    const end = stage?.end ?? 100;
    displayProgress = Math.floor(interpolate(progress, [0, 1], [start, end]));
    blurPx = 20;
  } else if (currentStage === "resolve") {
    const stage = stages.find(s => s.stage === "resolve");
    const blurStart = stage?.blurStart ?? 20;
    blurPx = interpolate(progress, [0, 1], [blurStart, 0]);
    displayProgress = 100;
  }

  if (currentStage === "skeleton") {
    return (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "80%", height: "60%",
            borderRadius: 24,
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0.5 + Math.sin(frame * 0.1) * 0.2,
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>
            Generating...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          width: "80%", height: "60%",
          filter: blurPx > 0.5 ? `blur(${blurPx}px)` : undefined,
          borderRadius: 24, overflow: "hidden",
        }}
      >
        {children}
      </div>
      {displayProgress < 100 && (
        <span style={{ color: "#8ab4f8", fontSize: 32, fontWeight: 700 }}>
          {displayProgress}%
        </span>
      )}
    </div>
  );
};
