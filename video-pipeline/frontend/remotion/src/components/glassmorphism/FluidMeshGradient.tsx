import React, { useRef, useEffect, useCallback } from "react";
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";

interface Props {
  colors?: string[];
  speed?: number;
}

// Simple value noise for mesh gradient
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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export const FluidMeshGradient: React.FC<Props> = ({
  colors = ["#0D3B8E", "#E63946", "#F4A261", "#1A1A2E"],
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const t = (frame / fps) * speed * 0.3;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = 4;
    const w = 480, h = 270;
    canvas.width = w;
    canvas.height = h;

    const rgbs = colors.map(hexToRgb);
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const ux = (px / w) * 3 - 1.5;
        const uy = (py / h) * 3 - 1.5;

        const wx = fbm(ux + 0.5, uy + t * 0.12, 3);
        const wy = fbm(ux - t * 0.09, uy + 0.3, 3);

        const rx = fbm(ux + 1.7 * wx + 1.7 + 0.13 * t, uy + 1.7 * wy + 9.2 + 0.11 * t, 3);
        const ry = fbm(ux + 1.7 * wx + 8.3 + 0.11 * t, uy + 1.7 * wy + 2.8 + 0.13 * t, 3);

        const n = fbm(ux + 1.5 * rx, uy + 1.5 * ry, 4);
        const ci = Math.sqrt(ux * ux + uy * uy) * 0.4 + n * 0.8 + t * 0.04;

        // Map noise to color palette
        const idx = ((ci % rgbs.length) + rgbs.length) % rgbs.length;
        const ci0 = Math.floor(idx) % rgbs.length;
        const ci1 = (ci0 + 1) % rgbs.length;
        const frac = idx - Math.floor(idx);

        const [r0, g0, b0] = rgbs[ci0];
        const [r1, g1, b1] = rgbs[ci1];

        const br = 0.5 + 0.5 * n;
        const off = (py * w + px) * 4;
        data[off] = Math.min(255, (r0 + (r1 - r0) * frac) * br);
        data[off + 1] = Math.min(255, (g0 + (g1 - g0) * frac) * br);
        data[off + 2] = Math.min(255, (b0 + (b1 - b0) * frac) * br);
        data[off + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [t, colors]);

  useEffect(() => { render(); }, [render]);

  return (
    <AbsoluteFill>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", imageRendering: "auto" }}
      />
    </AbsoluteFill>
  );
};
