import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { FileCard } from "./FileCard";
import { colors, glow } from "../theme/tokens";

interface FileEntry {
  icon: string;
  name: string;
}

interface Props {
  files: FileEntry[];
  radius?: number;
  centerIcon?: string;
}

export const OrbitalProcessor: React.FC<Props> = ({
  files, radius = 140, centerIcon = "📄"
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const anglePerFile = 360 / files.length;

  return (
    <div style={{ position: "relative", width: 300, height: 300 }}>
      {/* Center document */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: 48,
        filter: "drop-shadow(0 0 15px #00F5D4)",
        zIndex: 2,
      }}>
        {centerIcon}
      </div>

      {/* Glowing orbit ring */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: radius * 2, height: radius * 2,
        borderRadius: "50%",
        border: `2px solid rgba(0, 245, 212, 0.3)`,
        boxShadow: glow.orbit,
        zIndex: 0,
      }} />

      {/* Orbiting files */}
      {files.map((file, i) => {
        const angleDeg = (frame / fps) * 50 + (i * anglePerFile);
        const rad = (angleDeg * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        return (
          <div key={i} style={{
            position: "absolute",
            left: "50%", top: "50%",
            transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
            zIndex: 1,
          }}>
            <FileCard {...file} />
          </div>
        );
      })}
    </div>
  );
};
