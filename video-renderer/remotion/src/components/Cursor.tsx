import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";

type Point = [frame: number, x: number, y: number];

function lerpPath(path: Point[], frame: number, axis: 1 | 2): number {
  if (path.length === 0) return 0;
  if (frame <= path[0][0]) return path[0][axis];
  if (frame >= path[path.length - 1][0]) return path[path.length - 1][axis];

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if (frame >= a[0] && frame <= b[0]) {
      const t = (frame - a[0]) / (b[0] - a[0]);
      return a[axis] + (b[axis] - a[axis]) * t;
    }
  }
  return path[path.length - 1][axis];
}

export const Cursor: React.FC<{ path: Point[] }> = ({ path }) => {
  const frame = useCurrentFrame();
  if (path.length < 2) return null;

  const x = lerpPath(path, frame, 1);
  const y = lerpPath(path, frame, 2);

  const isClicking = path.some((p, i) =>
    i > 0 && Math.abs(frame - p[0]) < 4 && Math.abs(p[2] - path[i - 1][2]) > 3
  );

  return (
    <div style={{
      position: "absolute", left: x, top: y,
      width: 24, height: 24,
      transform: `translate(-50%, -50%) scale(${isClicking ? 0.85 : 1})`,
      pointerEvents: "none", zIndex: 100,
    }}>
      <svg viewBox="0 0 24 24" fill="#0F0F0F">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.45.45 0 0 0 .32-.77L6.18 2.89a.45.45 0 0 0-.68.32Z" />
      </svg>
      {isClicking && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 40, height: 40, borderRadius: "50%",
          border: "2px solid rgba(0,0,0,0.2)",
          transform: "translate(-50%, -50%)", opacity: 0.5,
        }} />
      )}
    </div>
  );
};
