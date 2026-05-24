import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

/**
 * DarkNeonBg — 呼吸感暗色极光渐变背景
 *
 * 使用方式：
 *   import { DarkNeonBg } from "./backgrounds/DarkNeonBg";
 *   <AbsoluteFill>
 *     <DarkNeonBg />
 *     {/* 您的内容 *\/}
 *   </AbsoluteFill>
 */
export const DarkNeonBg: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // ── 呼吸节奏：以 180 帧为一个完整周期 ──
  const cycle = (frame % 180) / 180;
  const breathe = Math.sin(cycle * Math.PI * 2);       // -1 → 1 正弦波
  const breatheSlow = Math.sin((frame / 240) * Math.PI * 2); // 更慢的副波

  // ── 各光晕的动态位置 & 强度 ──
  // Cyan orb (top-left drift)
  const cyanX = interpolate(breathe, [-1, 1], [14, 24]);
  const cyanY = interpolate(breathe, [-1, 1], [8, 18]);
  const cyanAlpha = interpolate(breathe, [-1, 1], [0.18, 0.32]);

  // Purple orb (top-right drift, counter-phase)
  const purpleX = interpolate(breathe, [-1, 1], [72, 62]);
  const purpleY = interpolate(breathe, [-1, 1], [5, 15]);
  const purpleAlpha = interpolate(breathe, [-1, 1], [0.14, 0.26]);

  // Teal orb (bottom-center, slow)
  const tealX = interpolate(breatheSlow, [-1, 1], [38, 48]);
  const tealY = interpolate(breatheSlow, [-1, 1], [68, 78]);
  const tealAlpha = interpolate(breatheSlow, [-1, 1], [0.10, 0.20]);

  // Rose orb (bottom-right, slow counter)
  const roseX = interpolate(breatheSlow, [-1, 1], [75, 65]);
  const roseY = interpolate(breatheSlow, [-1, 1], [70, 80]);
  const roseAlpha = interpolate(breatheSlow, [-1, 1], [0.08, 0.16]);

  // ── 网格线呼吸透明度 ──
  const gridAlpha = interpolate(breathe, [-1, 1], [0.025, 0.045]);

  return (
    <AbsoluteFill style={{ background: "#070B0A", overflow: "hidden" }}>

      {/* ── 底部深色噪波层：增加质感 ── */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 50% 120%, rgba(0,30,24,0.8) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Cyan 极光光晕 ── */}
      <div style={{
        position: "absolute",
        left: `${cyanX}%`,
        top: `${cyanY}%`,
        width: 900,
        height: 700,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(ellipse at center, rgba(0,245,212,${cyanAlpha}) 0%, transparent 65%)`,
        filter: "blur(80px)",
        pointerEvents: "none",
      }} />

      {/* ── Purple 极光光晕 ── */}
      <div style={{
        position: "absolute",
        left: `${purpleX}%`,
        top: `${purpleY}%`,
        width: 750,
        height: 600,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(ellipse at center, rgba(139,92,246,${purpleAlpha}) 0%, transparent 65%)`,
        filter: "blur(90px)",
        pointerEvents: "none",
      }} />

      {/* ── Teal 底部光晕 ── */}
      <div style={{
        position: "absolute",
        left: `${tealX}%`,
        top: `${tealY}%`,
        width: 700,
        height: 500,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(ellipse at center, rgba(20,184,166,${tealAlpha}) 0%, transparent 65%)`,
        filter: "blur(100px)",
        pointerEvents: "none",
      }} />

      {/* ── Rose 底部点缀光晕 ── */}
      <div style={{
        position: "absolute",
        left: `${roseX}%`,
        top: `${roseY}%`,
        width: 550,
        height: 400,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(ellipse at center, rgba(244,63,94,${roseAlpha}) 0%, transparent 65%)`,
        filter: "blur(90px)",
        pointerEvents: "none",
      }} />

      {/* ── 细格线网格 ── */}
      <AbsoluteFill style={{
        backgroundImage: `
          linear-gradient(rgba(0,245,212,${gridAlpha}) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,212,${gridAlpha}) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
        pointerEvents: "none",
      }} />

      {/* ── 顶部中央主光晕（标志性呼吸点） ── */}
      <div style={{
        position: "absolute",
        top: "-15%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 1100,
        height: 600,
        background: `radial-gradient(ellipse at center top, rgba(0,245,212,${interpolate(breathe, [-1, 1], [0.06, 0.13])}) 0%, transparent 65%)`,
        filter: "blur(60px)",
        pointerEvents: "none",
      }} />

      {/* ── 顶部极细高光边缘线 ── */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: 1,
        background: `linear-gradient(90deg, transparent 0%, rgba(0,245,212,${interpolate(breathe, [-1, 1], [0.15, 0.35])}) 30%, rgba(139,92,246,${interpolate(breathe, [-1, 1], [0.10, 0.25])}) 70%, transparent 100%)`,
        pointerEvents: "none",
      }} />

    </AbsoluteFill>
  );
};
