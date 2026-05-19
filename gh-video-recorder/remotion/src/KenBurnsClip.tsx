import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";

export interface KenBurnsClipProps {
  imageUrl: string;
  durationInFrames: number;
  panFromX: number;
  panFromY: number;
  panToX: number;
  panToY: number;
  zoomFrom: number;
  zoomTo: number;
}

export const KenBurnsClip: React.FC<KenBurnsClipProps> = ({
  imageUrl,
  durationInFrames,
  panFromX = 0.5,
  panFromY = 0.5,
  panToX = 0.5,
  panToY = 0.5,
  zoomFrom = 1.0,
  zoomTo = 1.3,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const progress = interpolate(
    frame,
    [0, durationInFrames - 1],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const scale = interpolate(progress, [0, 1], [zoomFrom, zoomTo]);
  const panX = interpolate(progress, [0, 1], [panFromX, panToX]);
  const panY = interpolate(progress, [0, 1], [panFromY, panToY]);

  // Convert normalized (0-1) pan to pixel offset from center
  const offsetX = (panX - 0.5) * width * 0.3;
  const offsetY = (panY - 0.5) * height * 0.3;

  // Handle both staticFile paths and external URLs
  const src = imageUrl.startsWith("http")
    ? imageUrl
    : staticFile(imageUrl);

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
