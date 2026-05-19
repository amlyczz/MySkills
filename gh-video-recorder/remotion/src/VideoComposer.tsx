/**
 * VideoComposer.tsx — 场景序列渲染器。
 *
 * 接收 VideoConfig，遍历结构模板中的场景序列，
 * 用 Remotion <Sequence> 按时间排列每个场景。
 *
 * 这替代了 Root.tsx 中固定的 Intro/Outro Composition，
 * 是 Phase 2+ 的统一渲染入口。
 */
import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { VideoConfig, SceneConfig, SceneDef, StyleTemplate } from "./types";
import { styleTemplates } from "./styles";
import { getStructure } from "./structures";
import { sceneRegistry } from "./scenes";
import { BgType } from "./backgrounds";

export interface VideoComposerProps {
  config: VideoConfig;
}

export const VideoComposer: React.FC<VideoComposerProps> = ({ config }) => {
  const structure = getStructure(config.structureId);

  if (!structure) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          color: "#f00",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 40,
        }}
      >
        Unknown structure: {config.structureId}
      </AbsoluteFill>
    );
  }

  const style = styleTemplates.find((s) => s.id === config.styleId) ?? styleTemplates[0];
  let currentFrame = 0;

  return (
    <AbsoluteFill>
      {structure.scenes.map((sceneDef) => {
        const startFrame = currentFrame;
        const durationFrames =
          sceneDef.durationSeconds > 0
            ? sceneDef.durationSeconds * 30
            : 10 * 30; // showcase 动态时长默认 10s
        currentFrame += durationFrames;

        const sceneConfig = config.sceneConfigs[sceneDef.id] ?? {
          layoutId: "hero-center" as const,
          motionMap: {},
          content: {},
        };

        const SceneComponent = sceneRegistry[sceneDef.type];

        if (!SceneComponent) {
          return null;
        }

        return (
          <Sequence
            key={sceneDef.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <SceneComponent
              content={sceneConfig.content}
              style={style}
              bgType={config.bgType}
              layoutId={sceneConfig.layoutId}
              motionMap={sceneConfig.motionMap}
            />
          </Sequence>
        );
      })}

      {/* BGM — 全片铺底 */}
      {config.audio.bgm && config.audio.bgm.src && (
        <Audio src={staticFile(config.audio.bgm.src)} volume={0.4} />
      )}
    </AbsoluteFill>
  );
};
