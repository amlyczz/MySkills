/**
 * VirtualCamera — 虚拟摄像机运镜组件。
 *
 * 包裹内容层，根据 CameraAction 执行 PanAndZoom：
 *   - triggerFrame 之前：保持原始状态（scale=1, 无位移）
 *   - triggerFrame 之后：弹簧驱动缩放+平移，聚焦到 focusPoint
 *
 * 用法：
 *   <VirtualCamera action={cameraAction} sceneFrames={180}>
 *     <Video src="recording.mp4" />
 *   </VirtualCamera>
 */
import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export interface CameraAction {
  type: "pan-and-zoom";
  targetScale: number;       // 目标缩放倍率（1.0 → 2.5）
  focusPoint: { x: number; y: number }; // 焦点坐标，0-1 比例（0.5=居中）
  triggerFrame: number;      // 在第几帧触发运镜
}

interface Props {
  action: CameraAction;
  /** 场景总帧数，用于 duration 上限 */
  sceneFrames: number;
  children: React.ReactNode;
}

export const VirtualCamera: React.FC<Props> = ({ action, sceneFrames, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { targetScale, focusPoint, triggerFrame } = action;
  const activeFrame = Math.max(0, frame - triggerFrame);
  const animFrames = Math.max(1, sceneFrames - triggerFrame);

  // Spring-driven zoom progress
  const zoomProgress = spring({
    frame: activeFrame,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.8 },
    durationInFrames: animFrames,
  });

  const currentScale = interpolate(zoomProgress, [0, 1], [1, targetScale]);
  // Focus point → translate to center the target
  const centerX = 0.5;
  const centerY = 0.5;
  const tx = interpolate(zoomProgress, [0, 1], [0, (centerX - focusPoint.x) * 100 * targetScale]);
  const ty = interpolate(zoomProgress, [0, 1], [0, (centerY - focusPoint.y) * 100 * targetScale]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          transform: `scale(${currentScale}) translate(${tx}%, ${ty}%)`,
          transformOrigin: "center center",
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
};
