/**
 * ChapterProgressBar — 章节进度条叠加组件。
 *
 * 支持 5 种样式：minimal-dots / labeled-bar / gradient-fill / segment-blocks / timeline-ticks。
 * 叠加在视频最上层，底部 60px 半透明区域。
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Chapter, ProgressBarStyle } from "../types";

interface ChapterProgressBarProps {
  chapters: Chapter[];
  totalDuration: number;
  style?: ProgressBarStyle;
}

export const ChapterProgressBar: React.FC<ChapterProgressBarProps> = ({
  chapters,
  totalDuration,
  style: barStyle = "labeled-bar",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  if (!chapters || chapters.length === 0) return null;

  const currentChapterIndex = findCurrentChapter(chapters, currentTime);
  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

  switch (barStyle) {
    case "minimal-dots":
      return <MinimalDots chapters={chapters} currentIndex={currentChapterIndex} />;
    case "labeled-bar":
      return <LabeledBar chapters={chapters} currentIndex={currentChapterIndex} currentTime={currentTime} totalDuration={totalDuration} />;
    case "gradient-fill":
      return <GradientFill progress={progress} chapters={chapters} currentIndex={currentChapterIndex} />;
    case "segment-blocks":
      return <SegmentBlocks chapters={chapters} currentIndex={currentChapterIndex} totalDuration={totalDuration} />;
    case "timeline-ticks":
      return <TimelineTicks chapters={chapters} currentTime={currentTime} totalDuration={totalDuration} progress={progress} />;
    case "water-flow":
      return <WaterFlowBar chapters={chapters} currentIndex={currentChapterIndex} currentTime={currentTime} totalDuration={totalDuration} />;
    default:
      return <LabeledBar chapters={chapters} currentIndex={currentChapterIndex} currentTime={currentTime} totalDuration={totalDuration} />;
  }
};

function findCurrentChapter(chapters: Chapter[], currentTime: number): number {
  let idx = 0;
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (currentTime >= chapters[i].time) {
      idx = i;
      break;
    }
  }
  return idx;
}

// ── 样式组件 ──

/** minimal-dots: 底部一排圆点 */
function MinimalDots({
  chapters,
  currentIndex,
}: {
  chapters: Chapter[];
  currentIndex: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 12,
        padding: "8px 0",
        background: "rgba(0,0,0,0.5)",
      }}
    >
      {chapters.map((ch, i) => (
        <div
          key={i}
          style={{
            width: i === currentIndex ? 10 : 7,
            height: i === currentIndex ? 10 : 7,
            borderRadius: "50%",
            background:
              i < currentIndex
                ? "rgba(255,255,255,0.35)"
                : i === currentIndex
                ? "rgba(255,255,255,0.9)"
                : "rgba(255,255,255,0.15)",
          }}
        />
      ))}
    </div>
  );
}

/** labeled-bar: 细条 + 当前章节名 */
function LabeledBar({
  chapters,
  currentIndex,
  currentTime,
  totalDuration,
}: {
  chapters: Chapter[];
  currentIndex: number;
  currentTime: number;
  totalDuration: number;
}) {
  const segProgress =
    totalDuration > 0
      ? Math.min(1, Math.max(0, currentTime / totalDuration))
      : 0;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        paddingLeft: 24,
        paddingRight: 24,
        gap: 16,
      }}
    >
      {/* 进度条 */}
      <div
        style={{
          flex: 1,
          height: 3,
          background: "rgba(255,255,255,0.15)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${segProgress * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, #6c5ce7, #a855f7)",
            borderRadius: 2,
          }}
        />
      </div>

      {/* 当前章节名 */}
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "rgba(255,255,255,0.9)",
          whiteSpace: "nowrap",
        }}
      >
        {chapters[currentIndex]?.label || ""}
      </span>

      {/* 章节圆点 */}
      <div style={{ display: "flex", gap: 8 }}>
        {chapters.map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background:
                i === currentIndex
                  ? "#a855f7"
                  : i < currentIndex
                  ? "rgba(255,255,255,0.4)"
                  : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** gradient-fill: 渐变色填充条 */
function GradientFill({
  progress,
  chapters,
  currentIndex,
}: {
  progress: number;
  chapters: Chapter[];
  currentIndex: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* 渐变填充 */}
      <div
        style={{
          height: 4,
          background: "linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #a855f7)",
          width: `${progress * 100}%`,
          borderRadius: "2px 0 0 2px",
          marginBottom: 4,
          marginLeft: 8,
        }}
      />
      {/* 章节标签 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "4px 8px 8px",
        }}
      >
        {chapters.map((ch, i) => (
          <span
            key={i}
            style={{
              fontSize: 11,
              color: i === currentIndex ? "#fff" : "rgba(255,255,255,0.4)",
              fontWeight: i === currentIndex ? 600 : 400,
              maxWidth: 100,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ch.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** segment-blocks: 分段色块 */
function SegmentBlocks({
  chapters,
  currentIndex,
  totalDuration,
}: {
  chapters: Chapter[];
  currentIndex: number;
  totalDuration: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 36,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        gap: 3,
        padding: "6px 8px",
      }}
    >
      {chapters.map((_, i) => {
        const start = chapters[i].time;
        const end =
          i < chapters.length - 1
            ? chapters[i + 1].time
            : totalDuration;
        const widthPct =
          totalDuration > 0
            ? ((end - start) / totalDuration) * 100
            : 100 / chapters.length;

        const colors = [
          "#ff6b6b",
          "#feca57",
          "#48dbfb",
          "#a855f7",
          "#ff9ff3",
          "#54a0ff",
        ];

        return (
          <div
            key={i}
            style={{
              width: `${widthPct}%`,
              height: "100%",
              background: colors[i % colors.length],
              borderRadius: 4,
              opacity: i === currentIndex ? 1 : i < currentIndex ? 0.5 : 0.25,
              boxShadow:
                i === currentIndex
                  ? `0 0 8px ${colors[i % colors.length]}80`
                  : "none",
            }}
          />
        );
      })}
    </div>
  );
}

/** water-flow: 底部全宽水流式进度条 */
function WaterFlowBar({
  chapters,
  currentIndex,
  currentTime,
  totalDuration,
}: {
  chapters: Chapter[];
  currentIndex: number;
  currentTime: number;
  totalDuration: number;
}) {
  const frame = useCurrentFrame();
  const progress = totalDuration > 0 ? Math.min(1, Math.max(0, currentTime / totalDuration)) : 0;

  // Continuous left-to-right shimmer across entire bar (not oscillating)
  const shimmerPos = ((frame * 0.6) % 150) - 25;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 48,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* 背景条 */}
      <div
        style={{
          position: "relative",
          height: 40,
          margin: "4px 8px",
          background: "rgba(255,255,255,0.08)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {/* 水流填充层 — 从左向右连续推进 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background: "linear-gradient(90deg, #2563eb, #06b6d4)",
            borderRadius: 6,
            transition: "none",
          }}
        >
          {/* 光泽滑动效果 — 单向连续流动 */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "40%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
              transform: `translateX(${shimmerPos}%)`,
            }}
          />
        </div>

        {/* 垂直分割线 + 章节标签 (标签在填充层上方,避免叠加) */}
        {chapters.map((ch, i) => {
          const chStart = ch.time;
          const chEnd =
            i < chapters.length - 1
              ? chapters[i + 1].time
              : totalDuration;
          const centerPct =
            totalDuration > 0
              ? ((chStart + chEnd) / 2 / totalDuration) * 100
              : ((i + 0.5) / chapters.length) * 100;
          const dividerPct =
            i > 0 && totalDuration > 0
              ? (chStart / totalDuration) * 100
              : 0;
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;

          return (
            <React.Fragment key={i}>
              {/* 分割线 */}
              {i > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: `${dividerPct}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: "rgba(255,255,255,0.2)",
                  }}
                />
              )}
              {/* 章节标签 —— 添加文字阴影穿透背景 */}
              <span
                style={{
                  position: "absolute",
                  left: `${centerPct}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: 11,
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? "#e0f2fe" : "rgba(255,255,255,0.5)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "18%",
                  zIndex: 2,
                  textShadow: "0 0 6px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.7)",
                }}
              >
                {ch.label}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/** timeline-ticks: 时间轴刻度 + 标签 */
function TimelineTicks({
  chapters,
  currentTime,
  totalDuration,
  progress,
}: {
  chapters: Chapter[];
  currentTime: number;
  totalDuration: number;
  progress: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 52,
        background: "rgba(0,0,0,0.55)",
        padding: "0 16px",
      }}
    >
      {/* 进度条 */}
      <div
        style={{
          position: "relative",
          height: 4,
          marginTop: 6,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${progress * 100}%`,
            background: "#54a0ff",
            borderRadius: 2,
          }}
        />
        {/* 播放头 */}
        <div
          style={{
            position: "absolute",
            left: `${progress * 100}%`,
            top: -4,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 0 6px rgba(84,160,255,0.8)",
            transform: "translateX(-50%)",
          }}
        />
      </div>

      {/* 时间码 + 标签 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        {chapters.map((ch, i) => {
          const pos = totalDuration > 0 ? (ch.time / totalDuration) * 100 : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute" as const,
                left: `${pos}%`,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            />
          );
        })}
      </div>

      {/* 标签行 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          position: "relative",
        }}
      >
        {chapters.map((ch, i) => {
          const pos = totalDuration > 0 ? (ch.time / totalDuration) * 100 : 0;
          const isCurrent =
            currentTime >= ch.time &&
            (i === chapters.length - 1 || currentTime < chapters[i + 1].time);
          return (
            <span
              key={i}
              style={{
                fontSize: 10,
                color: isCurrent ? "#fff" : "rgba(255,255,255,0.35)",
                fontWeight: isCurrent ? 600 : 400,
                whiteSpace: "nowrap",
              }}
            >
              {ch.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
