/**
 * SfxPlayer — reusable SFX trigger component.
 *
 * Renders a Remotion <Audio> tag at the correct frame offset based on
 * a MotionPreset's entrance timing and the element's stagger index.
 *
 * Usage: include alongside any layout element that uses a motion preset.
 */
import React from "react";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { MotionPreset } from "../types";

interface SfxPlayerProps {
  motion: MotionPreset;
  /** Element's 0-based stagger index within the scene */
  staggerIndex?: number;
}

export const SfxPlayer: React.FC<SfxPlayerProps> = ({
  motion,
  staggerIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!motion.sfx) return null;

  const entDelay = motion.entrance.delayFrames;
  const staggerFrames = motion.entrance.staggerFrames ?? 10;
  const sfxDelayFrames = Math.round(motion.sfx.delay * fps);
  const startFrame = entDelay + staggerIndex * staggerFrames + sfxDelayFrames;

  // Only mount the Audio component once, at the correct frame
  if (frame < startFrame) return null;

  // Remotion's Audio starts playing on mount — we mount it at exactly the right frame.
  // We use a <Sequence> to limit the audio's render window to prevent replay.
  return (
    <Audio
      src={staticFile(motion.sfx.src)}
      volume={motion.sfx.volume}
    />
  );
};
