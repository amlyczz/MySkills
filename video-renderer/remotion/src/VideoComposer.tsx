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
import { AbsoluteFill, Sequence, Audio, staticFile, useCurrentFrame } from "remotion";
import { VideoConfig, SceneConfig, SceneDef, StyleTemplate, Chapter } from "./types";
import { styleTemplates } from "./styles";
import { getStructure } from "./structures";
import { sceneRegistry } from "./scenes";
import { BgType } from "./backgrounds";
import { ChapterProgressBar } from "./components/ChapterProgressBar";
import { validateVideoConfig, formatValidationErrors } from "./schemas/validate";
import { generateBgmCurve } from "./audio/bgmCurve";

export interface VideoComposerProps {
  config: VideoConfig;
}

export const VideoComposer: React.FC<VideoComposerProps> = ({ config }) => {
  // ── Zod runtime validation ──
  const validation = validateVideoConfig(config);
  if (!validation.success) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#1a0000",
          color: "#ff4444",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 24,
          fontFamily: "monospace",
          padding: 80,
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 24, fontWeight: "bold" }}>
          VideoConfig Validation Failed
        </div>
        <pre style={{ whiteSpace: "pre-wrap", textAlign: "left", maxWidth: "100%" }}>
          {formatValidationErrors(validation.errors)}
        </pre>
      </AbsoluteFill>
    );
  }

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

  // ── BGM volume curve ──
  const bgmCurve = config.audio.bgm
    ? generateBgmCurve(structure, config.audio.voiceover, totalDuration)
    : [];

  return (
    <AbsoluteFill>
      {structure.scenes.map((sceneDef, idx) => {
        const fm = sceneFrameMap[idx];
        const sceneConfig = config.sceneConfigs[sceneDef.id] ?? {
          layoutId: "hero-center" as const,
          motionMap: {},
          content: {},
        };

        const SceneComponent = sceneRegistry[sceneDef.type];

        if (!SceneComponent) {
          return null;
        }

        // Adjust Sequence boundaries for transition overlap
        const overlapBefore = sceneConfig.transitionIn?.durationFrames ?? 0;
        const overlapAfter = sceneConfig.transitionOut?.durationFrames ?? 0;
        const effectiveFrom = Math.max(0, fm.startFrame - overlapBefore);
        const effectiveDuration = (fm.endFrame + overlapAfter) - effectiveFrom;

        return (
          <Sequence
            key={sceneDef.id}
            from={effectiveFrom}
            durationInFrames={effectiveDuration}
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
              transitionIn={sceneConfig.transitionIn}
              transitionOut={sceneConfig.transitionOut}
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

      {/* BGM — 全片铺底 with volume curve */}
      {config.audio.bgm && config.audio.bgm.src && (
        <BgmWithCurve src={config.audio.bgm.src} curve={bgmCurve} />
      )}

      {/* Voiceover — per-scene audio segments */}
      {config.audio.voiceoverEnabled && config.audio.voiceover.map((v, vi) => {
        const sceneFm = sceneFrameMap.find(f => f.id === v.sceneId);
        if (!sceneFm || !v.src) return null;
        const startFrame = Math.round(sceneFm.startFrame + v.startOffsetSeconds * 30);
        const durFrames = Math.round(v.durationSeconds * 30);
        return (
          <Sequence key={`vo-${vi}`} from={startFrame} durationInFrames={durFrames}>
            <Audio src={staticFile(v.src)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** BGM component with frame-accurate volume curve interpolation */
const BgmWithCurve: React.FC<{ src: string; curve: { time: number; volume: number }[] }> = ({
  src,
  curve,
}) => {
  const frame = useCurrentFrame();
  const time = frame / 30;

  let volume = 0.4;
  if (curve.length > 0) {
    const nextIdx = curve.findIndex((p) => p.time > time);
    if (nextIdx === -1) {
      volume = curve[curve.length - 1].volume;
    } else if (nextIdx === 0) {
      volume = curve[0].volume;
    } else {
      const prev = curve[nextIdx - 1];
      const next = curve[nextIdx];
      const t = (time - prev.time) / (next.time - prev.time);
      volume = prev.volume + (next.volume - prev.volume) * t;
    }
  }

  return <Audio src={staticFile(src)} volume={volume} />;
};
