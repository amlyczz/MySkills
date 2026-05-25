import React, { useCallback, useEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";

// ── Compact value noise ──
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263 + 1274126177;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function noise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix, iy), n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1), n11 = hash(ix + 1, iy + 1);
  return n00 + (n10 - n00) * sx + (n01 - n00) * sy + (n00 - n10 - n01 + n11) * sx * sy;
}

function fbm(x: number, y: number, octaves: number): number {
  let v = 0, amp = 0.5, freq = 1, tot = 0;
  for (let i = 0; i < octaves; i++) { v += amp * noise(x * freq, y * freq); tot += amp; amp *= 0.5; freq *= 2; }
  return v / tot;
}

// Cosine palette
const P = { a: [0.5, 0.5, 0.5] as const, b: [0.5, 0.5, 0.5] as const, c: [1.0, 1.0, 1.0] as const, d: [0.0, 0.33, 0.67] as const };
function palette(t: number): [number, number, number] {
  return [
    P.a[0] + P.b[0] * Math.cos(6.28318 * (P.c[0] * t + P.d[0])),
    P.a[1] + P.b[1] * Math.cos(6.28318 * (P.c[1] * t + P.d[1])),
    P.a[2] + P.b[2] * Math.cos(6.28318 * (P.c[2] * t + P.d[2])),
  ];
}

export const FluidAurora: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const t = frame / fps;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render at 1/4 resolution for performance, CSS upscales with natural blur
    const scale = 4;
    const w = 480, h = 270;
    canvas.width = w;
    canvas.height = h;

    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        let ux = (px / w) * 4 - 2;
        let uy = (py / h) * 4 - 2;

        const wx = fbm(ux + 0.5, uy + t * 0.08, 3);
        const wy = fbm(ux - t * 0.06, uy + 0.3, 3);

        const rx = fbm(ux + 1.7 * wx + 1.7 + 0.15 * t, uy + 1.7 * wy + 9.2 + 0.126 * t, 3);
        const ry = fbm(ux + 1.7 * wx + 8.3 + 0.126 * t, uy + 1.7 * wy + 2.8 + 0.15 * t, 3);

        const n = fbm(ux + 1.5 * rx, uy + 1.5 * ry, 4);
        const ci = Math.sqrt(ux * ux + uy * uy) * 0.5 + n * 0.8 + t * 0.05;
        const [r, g, b] = palette(ci);
        const br = 0.6 + 0.4 * n;

        const idx = (py * w + px) * 4;
        data[idx] = Math.min(255, (r * br + 0.3) * 255 * intensity);
        data[idx + 1] = Math.min(255, (g * br + 0.25) * 255 * intensity);
        data[idx + 2] = Math.min(255, (b * br + 0.2) * 255 * intensity);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [t, intensity]);

  useEffect(() => { render(); }, [render]);

  return (
    <AbsoluteFill>
      <canvas ref={canvasRef}
        style={{ width: "100%", height: "100%", imageRendering: "auto" }} />
    </AbsoluteFill>
  );
};
