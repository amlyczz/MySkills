/**
 * AnimatedBarChart — 弹性生长柱状图组件。
 *
 * 对标 Cohere Command A+ 发布视频的数据展示风格：
 * 毛玻璃底色 + 对比条（previousValue 灰色底 / value 渐变色弹性生长）+
 * 弹簧物理回弹 + 逐条 stagger 延迟。
 *
 * Props:
 *   data: Array<{ label, value (0-100), previousValue? }>
 *   accentColor: 当前值渐变颜色
 *   staggerDelay: 每条柱子延迟帧数 (default 15)
 */
import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";

export interface BarChartItem {
  label: string;
  value: number;        // 0-100
  previousValue?: number; // 0-100
}

interface Props {
  data: BarChartItem[];
  accentColor?: string;
  staggerDelay?: number;
}

export const AnimatedBarChart: React.FC<Props> = ({
  data,
  accentColor = "#ff6b35",
  staggerDelay = 15,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        width: "100%",
        maxWidth: 700,
      }}
    >
      {data.map((item, index) => {
        const barProgress = spring({
          frame: frame - index * staggerDelay,
          fps,
          config: { damping: 12, stiffness: 100, mass: 0.8 },
        });

        const prevWidth = (item.previousValue ?? 0) * barProgress;
        const currWidth = item.value * barProgress;

        return (
          <div key={item.label} style={{ position: "relative", width: "100%" }}>
            {/* Label */}
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{item.label}</span>
              <span style={{ color: accentColor }}>
                {Math.round(item.value * barProgress)}%
              </span>
            </div>
            {/* Bar container */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 48,
                borderRadius: 24,
                overflow: "hidden",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              {/* Previous value (gray) */}
              {item.previousValue !== undefined && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: `${Math.min(prevWidth, 100)}%`,
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 24,
                  }}
                />
              )}
              {/* Current value (accent gradient) */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${Math.min(currWidth, 100)}%`,
                  background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
                  borderRadius: 24,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 24,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
