import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { MotionType } from "../types";
import { useEntrance } from "./useEntrance";
import { motionPresets } from "../motions";
import React from "react";

export interface LifecycleOptions {
  delayFrames?: number;
  sceneDurationFrames?: number;
  staggerIndex?: number;
  staggerInterval?: number; // default 10
}

export function useElementLifecycle(
  motionType: MotionType,
  options: LifecycleOptions = {}
): {
  style: React.CSSProperties;
  phase: "intro" | "idle" | "exit" | "hidden";
} {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const motion = motionPresets[motionType];

  if (!motion) {
    return { style: {}, phase: "idle" };
  }

  const staggerDelay = (options.staggerIndex || 0) * (options.staggerInterval ?? 10);
  const totalDelay = (options.delayFrames || 0) + staggerDelay;
  
  const sceneDur = options.sceneDurationFrames || durationInFrames;
  const exitFrames = motion.exit?.durationFrames || 0;
  const exitStartFrame = sceneDur - exitFrames;

  // Determine current phase
  let phase: "intro" | "idle" | "exit" | "hidden" = "hidden";
  if (frame < totalDelay) {
    phase = "hidden";
  } else if (frame >= exitStartFrame && exitFrames > 0) {
    phase = "exit";
  } else if (frame < totalDelay + motion.entrance.durationFrames) {
    phase = "intro";
  } else {
    phase = "idle";
  }

  const localFrame = Math.max(0, frame - totalDelay);
  const entranceRes = useEntrance(motion, localFrame);

  let transform = entranceRes.transform || "";
  let opacity = entranceRes.opacity;
  let clipPath = entranceRes.clipPath;
  let filter = entranceRes.filter || "";

  // Apply Idle Phase modifications
  if (phase === "idle" || phase === "intro" || phase === "exit") {
    if (motion.idle && motion.idle.type !== "none") {
      const idleOffsetFrame = localFrame; 
      const freq = motion.idle.frequency || 0.02;
      const phaseOffset = motion.idle.phaseOffset || 0;
      const t = idleOffsetFrame * freq + phaseOffset;

      if (motion.idle.type === "float" || motion.idle.type === "breathe") {
        const amp = motion.idle.amplitude || 4;
        const floatY = Math.sin(t) * amp;
        transform += ` translateY(${floatY}px)`;
      }
      
      if (motion.idle.type === "glow") {
        const intensity = motion.idle.glowIntensity || 1;
        const glowVal = (Math.sin(t) * 0.5 + 0.5) * intensity;
        filter += ` drop-shadow(0 0 ${10 * glowVal}px rgba(255,255,255,${0.5 * glowVal}))`;
      }
    }
  }

  // Apply Exit Phase modifications
  if (phase === "exit" && motion.exit) {
    const exitLocalFrame = frame - exitStartFrame;
    const prog = interpolate(exitLocalFrame, [0, exitFrames], [0, 1], { extrapolateRight: "clamp" });

    switch (motion.exit.type) {
      case "fade-out":
        opacity *= interpolate(prog, [0, 1], [1, 0]);
        break;
      case "slide-out": {
        const dir = motion.exit.direction || "left";
        const offset = interpolate(prog, [0, 1], [0, dir === "left" || dir === "up" ? -100 : 100]);
        const axis = dir === "left" || dir === "right" ? "X" : "Y";
        transform += ` translate${axis}(${offset}px)`;
        opacity *= interpolate(prog, [0, 1], [1, 0]);
        break;
      }
      case "scale-down":
        transform += ` scale(${interpolate(prog, [0, 1], [1, 0.8])})`;
        opacity *= interpolate(prog, [0, 1], [1, 0]);
        break;
      case "blur-out":
      case "whip-blur":
        opacity *= interpolate(prog, [0, 1], [1, 0]);
        const blurAmt = motion.exit.motionBlur || 20;
        filter += ` blur(${interpolate(prog, [0, 1], [0, blurAmt])}px)`;
        break;
    }
  }

  if (phase === "hidden") {
    opacity = 0;
  }

  const style: React.CSSProperties = {
    opacity,
    transform: transform.trim() || undefined,
    clipPath,
    filter: filter.trim() || undefined,
  };

  return { style, phase };
}
