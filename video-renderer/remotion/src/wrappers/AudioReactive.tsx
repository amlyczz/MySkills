/**
 * AudioReactive — 音频反应包装容器。
 *
 * 包裹内容层，在鼓点爆发时产生：
 * - 全局呼吸缩放 (globalScale)
 * - 色差分离特效 (chromatic aberration)
 * - 运动模糊 (motion blur)
 *
 * 与现有的 AudioConfig（编排层）和 audio_mixer.py（混音层）互补。
 */
import React from "react";
import { useAudioEnergy } from "../hooks/useAudioEnergy";

interface Props {
  children: React.ReactNode;
  audioSrc: string;
  frequencyBand?: "bass" | "treble" | "full";
  burstIntensity?: number;
  chromaticAberration?: boolean;
}

export const AudioReactive: React.FC<Props> = ({
  children,
  audioSrc,
  frequencyBand = "bass",
  burstIntensity = 2.5,
  chromaticAberration = true,
}) => {
  const energy = useAudioEnergy(audioSrc, frequencyBand, burstIntensity * 0.6);

  const globalScale = 1 + energy * 0.15;
  const motionBlur = energy * 8;
  const brightness = 1 + energy * 0.3;

  const caFilter =
    chromaticAberration && energy > 0.75
      ? `drop-shadow(4px 0 0 rgba(255,0,0,${energy * 0.4}))
         drop-shadow(-4px 0 0 rgba(0,255,255,${energy * 0.4}))`
      : undefined;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: `scale(${globalScale})`,
        filter: [
          motionBlur > 0.5 ? `blur(${motionBlur}px)` : "",
          `brightness(${brightness})`,
          caFilter,
        ]
          .filter(Boolean)
          .join(" "),
      }}
    >
      {children}
    </div>
  );
};
