/**
 * ChapterProgressBar — 章节进度条叠加组件。
 *
 * 支持 5 种样式：minimal-dots / labeled-bar / gradient-fill / segment-blocks / timeline-ticks。
 * 叠加在视频最上层，底部 60px 半透明区域。
 */
import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
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
            transition: "all 0.3s",
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
