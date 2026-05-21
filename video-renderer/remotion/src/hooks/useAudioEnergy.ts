/**
 * useAudioEnergy — 音频能量萃取 Hook。
 *
 * 利用 @remotion/media-utils 的 FFT 频谱分析，
 * 提取指定频段的音量能量值（0~1），用于帧级视觉踩点。
 *
 * @param audioSrc  音频文件路径
 * @param frequencyBand  监听频段："bass"（低音鼓点）| "treble"（高音）| "full"（全频段）
 * @param smoothing  能量归一化系数，默认 1.5
 * @returns 0~1 的能量值
 */
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";

export const useAudioEnergy = (
  audioSrc: string,
  frequencyBand: "bass" | "treble" | "full" = "bass",
  smoothing: number = 1.5,
): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const audioData = useAudioData(audioSrc);

  if (!audioData) return 0;

  const frequencies = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples: 64,
  });

  let targetFrequencies: number[];
  if (frequencyBand === "bass") {
    targetFrequencies = frequencies.slice(0, 5);
  } else if (frequencyBand === "treble") {
    targetFrequencies = frequencies.slice(40, 60);
  } else {
    targetFrequencies = frequencies;
  }

  const rawEnergy =
    targetFrequencies.reduce((a, b) => a + b, 0) / targetFrequencies.length;

  return Math.min(1, rawEnergy * smoothing);
};
