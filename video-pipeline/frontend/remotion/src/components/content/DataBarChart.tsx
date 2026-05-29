import React from "react";

interface BarData {
  label: string;
  value: number;
  compareValue?: number;
  /** Per-bar max value override. Falls back to chart-level maxValue. */
  maxValue?: number;
}

interface Props {
  data: BarData[];
  maxValue?: number | "auto";
  showComparison?: boolean;
  staggerDelay?: number;
  isHighlight?: boolean;
  className?: string;
}

export const DataBarChart: React.FC<Props> = ({
  data = [],
  maxValue: maxValueProp = "auto",
  showComparison = false,
  staggerDelay = 10,
  isHighlight = false,
  className,
}) => {
  const resolvedMax =
    maxValueProp === "auto"
      ? Math.max(...data.map((d) => d.value), ...data.map((d) => d.compareValue || 0)) * 1.1
      : maxValueProp;

  return (
    <div className={`w-full ${className || ""}`}>
      {data.map((bar, i) => (
        <BarRow
          key={i}
          bar={bar}
          maxValue={resolvedMax}
          showComparison={showComparison}
          isHighlight={isHighlight}
        />
      ))}
    </div>
  );
};

const BarRow: React.FC<{
  bar: BarData;
  maxValue: number;
  showComparison: boolean;
  isHighlight: boolean;
}> = ({ bar, maxValue, showComparison, isHighlight }) => {
  const barMax = bar.maxValue || maxValue;
  const pct = Math.round((bar.value / barMax) * 100);
  const barWidth = (bar.value / barMax) * 100;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-10 font-sans w-full">
        <div className="w-[200px] text-2xl text-black text-right font-medium">
          {bar.label}
        </div>
        <div className="flex-1 relative">
          {/* Base track */}
          {showComparison && (
            <div
              className="absolute inset-0 h-16 bg-[#E5E5EA] rounded-full"
              style={{ width: `${((bar.compareValue || 0) / maxValue) * 100}%` }}
            />
          )}
          {/* Animated bar (now dumb) */}
          <div
            className={`h-16 rounded-full flex justify-end items-center pr-6 origin-left relative z-10 min-w-[60px] ${
              isHighlight ? "bg-[linear-gradient(90deg,#FF7B72,#FF3B30)]" : "bg-black/5"
            }`}
            style={{ width: `${barWidth}%` }}
          >
            <span
              className={`text-[28px] font-semibold ${
                isHighlight ? "text-white" : "text-black"
              }`}
            >
              {pct}%
            </span>
          </div>
        </div>
      </div>
      {showComparison && bar.compareValue !== undefined && (
        <div className="ml-[240px] -mt-3 flex gap-3">
          <span className="text-[13px] text-[#FF3B30] font-sans">
            Command A+
          </span>
          <span className="text-[13px] text-[#86868B] font-sans">
            GPT-4o: {bar.compareValue}%
          </span>
        </div>
      )}
    </div>
  );
};
