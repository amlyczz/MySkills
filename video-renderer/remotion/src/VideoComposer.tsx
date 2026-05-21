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
import { VideoConfig, SceneConfig, SceneDef, StyleTemplate, Chapter } from "./types";
import { styleTemplates } from "./styles";
import { getStructure } from "./structures";
import { sceneRegistry } from "./scenes";
import { BgType } from "./backgrounds";
import { ChapterProgressBar } from "./components/ChapterProgressBar";

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

  // 计算章节（每个场景=一个章节）和时间轴
  const chapters: Chapter[] = [];
  const sceneFrameMap: Array<{
    id: string;
    startFrame: number;
    endFrame: number;
  }> = [];
  let currentFrame = 0;

  for (const sceneDef of structure.scenes) {
    const sceneConfig = config.sceneConfigs[sceneDef.id];
    const configDur = sceneConfig?.durationSeconds;
    const durationFrames =
      (configDur && configDur > 0 ? configDur :
       sceneDef.durationSeconds > 0 ? sceneDef.durationSeconds :
       10) * 30;
    const label = sceneConfig?.content?.title as string
      || sceneConfig?.content?.headline as string
      || sceneDef.id;

    chapters.push({
      label: typeof label === "string" ? label : sceneDef.id,
      time: currentFrame / 30,
    });
    sceneFrameMap.push({
      id: sceneDef.id,
      startFrame: currentFrame,
      endFrame: currentFrame + durationFrames,
    });
    currentFrame += durationFrames;
  }

  const totalDuration = currentFrame / 30;

  return (
    <AbsoluteFill>
      {structure.scenes.map((sceneDef, idx) => {
        const fm = sceneFrameMap[idx];
        const durationFrames = fm.endFrame - fm.startFrame;
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
            from={fm.startFrame}
            durationInFrames={durationFrames}
          >
            <SceneComponent
              content={sceneConfig.content}
              chartData={sceneConfig.chartData}
              staggerOrder={sceneConfig.content?.staggerOrder as string[] | undefined}
              cameraAction={sceneConfig.cameraAction}
              wrapperType={sceneConfig.wrapperType}
              style={style}
              bgType={config.bgType}
              layoutId={sceneConfig.layoutId}
              motionMap={sceneConfig.motionMap}
            />
          </Sequence>
        );
      })}

      {/* 章节进度条 overlay */}
      <ChapterProgressBar
        chapters={chapters}
        totalDuration={totalDuration}
        style="labeled-bar"
      />

      {/* BGM — 全片铺底 */}
      {config.audio.bgm && config.audio.bgm.src && (
        <Audio src={staticFile(config.audio.bgm.src)} volume={0.4} />
      )}
    </AbsoluteFill>
  );
};
