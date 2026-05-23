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

/** water-flow: 多层 sin 波叠加模拟真实水流动效
 *
 * 使用 3 层正弦波叠加生成波浪表面曲线，通过 clip-path 裁剪填充区域。
 * 替代旧版 CSS translateX 渐变条纹方案。
 *
 * 物理参数：
 *   主波 A1=4px, k1=0.025, w1=0.045 — 低频高幅，基础波浪
 *   次波 A2=2px, k2=0.04,  w2=0.07  — 中频中幅，叠加波纹
 *   涟漪 A3=1px, k3=0.06,  w3=0.12  — 高频低幅，表面细节
 */
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
  const { width } = useVideoConfig();
  const progress = totalDuration > 0 ? Math.min(1, Math.max(0, currentTime / totalDuration)) : 0;

  // Bar dimensions
  const barMarginX = 10;
  const barWidth = width - barMarginX * 2;
  const fillWidth = barWidth * progress;
  const barWidthPct = barWidth > 0 ? (fillWidth / barWidth) * 100 : 0;

  // Wave parameters
  const A1 = 4, k1 = 0.025, w1 = 0.045, phi1 = 0;
  const A2 = 2, k2 = 0.04,  w2 = 0.07,  phi2 = 1.8;
  const A3 = 1, k3 = 0.06,  w3 = 0.12,  phi3 = 3.2;

  // Generate wave surface points along the filled width
  // 20 sampling points for smooth curve
  const numPoints = 20;
  const surfaceY = 10; // water surface sits 10px below bar top

  const wavePoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * fillWidth;
    const t = frame;
    const y = A1 * Math.sin(k1 * x - w1 * t + phi1)
            + A2 * Math.sin(k2 * x - w2 * t + phi2)
            + A3 * Math.sin(k3 * x - w3 * t + phi3);
    wavePoints.push({ x, y });
  }

  // Build clip-path polygon for the filled water region
  // Left edge: go up from bottom-left to water surface at x=0
  // Top edge: follow wave points
  // Right edge: from last wave point down to bottom-right
  // Bottom edge: along the bottom of the bar
  const waterBodyClip = [
    `0 ${surfaceY + wavePoints[0].y}px`,
    ...wavePoints.map((p) => `${p.x}px ${surfaceY + p.y}px`),
    `${fillWidth}px ${surfaceY + wavePoints[numPoints].y}px`,
    `${fillWidth}px 100%`,
    `0 100%`,
  ].join(",");

  // Surface highlight line — a thin bright stroke along the wave crest
  const surfaceLine = wavePoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${surfaceY + p.y}`)
    .join(" ");

  // Leading edge glow position (playhead)
  const edgeGlowX = fillWidth;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 52,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          position: "relative",
          height: 42,
          margin: "5px 10px",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {/* Bar track background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 8,
          }}
        />

        {/* Water body — clipped by wave polygon */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${barWidthPct}%`,
            background: "linear-gradient(180deg, #0ea5e9 0%, #0284c7 40%, #0369a1 100%)",
            clipPath: `polygon(${waterBodyClip})`,
          }}
        />

        {/* Surface highlight — SVG-like thin bright line along wave crest */}
        <svg
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: `${barWidthPct}%`,
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <path
            d={surfaceLine}
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>

        {/* Leading edge glow — playhead */}
        {progress > 0 && progress < 1 && (
          <div
            style={{
              position: "absolute",
              left: `${barWidthPct}%`,
              top: 0,
              bottom: 0,
              width: 3,
              background: "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))",
              boxShadow: "0 0 6px rgba(14,165,233,0.6)",
              transform: "translateX(-50%)",
              borderRadius: 2,
            }}
          />
        )}

        {/* Chapter labels — positioned across the bar, not clipped */}
        {chapters.map((ch, i) => {
          const chStart = ch.time;
          const chEnd =
            i < chapters.length - 1 ? chapters[i + 1].time : totalDuration;
          const centerPct =
            totalDuration > 0
              ? ((chStart + chEnd) / 2 / totalDuration) * 100
              : ((i + 0.5) / chapters.length) * 100;
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;

          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${centerPct}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: 13,
                fontWeight: isCurrent ? 700 : 500,
                color: isCurrent
                  ? "#ffffff"
                  : isPast
                  ? "rgba(255,255,255,0.65)"
                  : "rgba(255,255,255,0.35)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "20%",
                zIndex: 2,
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                letterSpacing: 0.5,
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
