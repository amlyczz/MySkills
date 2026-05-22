/**
 * VideoComposer.tsx — 场景序列渲染器。
 *
 * 接收 VideoConfig，使用 @remotion/transitions 的 <TransitionSeries>
 * 管理场景间过渡。
 *
 * 这替代了 Root.tsx 中固定的 Intro/Outro Composition，
 * 是 Phase 2+ 的统一渲染入口。
 */
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { VideoConfig, SceneConfig, Chapter, TransitionConfig, TransitionDirection } from "./types";
import { styleTemplates } from "./styles";
import { getStructure } from "./structures";
import { sceneRegistry } from "./scenes";
import { ChapterProgressBar } from "./components/ChapterProgressBar";
import { validateVideoConfig, formatValidationErrors } from "./schemas/validate";
import { generateBgmCurve } from "./audio/bgmCurve";
import { whipPan } from "./wrappers/whipPanPresentation";

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

  // timeline-adaptive: 场景列表从 sceneConfigs 动态派生
  const scenes = structure.id === "timeline-adaptive"
    ? Object.entries(config.sceneConfigs).map(([id, sc]) => ({
        id,
        type: layoutTypeToSceneType(sc.layoutId),
        durationSeconds: sc.durationSeconds || 10,
        contentSlots: [],
      }))
    : structure.scenes;

  // ── 构建场景数据（含帧精度）──
  interface SceneRenderData {
    id: string;
    type: string;
    durationFrames: number;
    label: string;
    config: SceneConfig;
  }

  const sceneData: SceneRenderData[] = [];
  for (const sceneDef of scenes) {
    const sceneConfig = config.sceneConfigs[sceneDef.id] ?? {
      layoutId: "hero-center" as const,
      motionMap: {},
      content: {},
    };
    const configDur = sceneConfig.durationSeconds;
    const durSecs =
      configDur && configDur > 0 ? configDur :
      sceneDef.durationSeconds > 0 ? sceneDef.durationSeconds :
      10;
    const safeDurSecs = durSecs > 0 && durSecs < 10000 ? durSecs : 10;
    const label = sceneConfig?.content?.title as string
      || sceneConfig?.content?.headline as string
      || sceneDef.id;

    sceneData.push({
      id: sceneDef.id,
      type: sceneDef.type,
      durationFrames: safeDurSecs * 30,
      label: typeof label === "string" ? label : sceneDef.id,
      config: sceneConfig,
    });
  }

  // ── 计算场景间过渡 presentation ──
  const transitions = sceneData.map((sd, i) => {
    if (i === sceneData.length - 1) return null;
    const currentOut = sd.config.transitionOut;
    const nextIn = sceneData[i + 1].config.transitionIn;
    return buildTransitionPresentation(currentOut, nextIn);
  });

  // ── 计算 adjusted 帧位置（扣除过渡重叠） ──
  const sceneFrameMap: Array<{ id: string; startFrame: number; endFrame: number }> = [];
  const chapters: Chapter[] = [];
  let adjustedFrame = 0;

  for (let i = 0; i < sceneData.length; i++) {
    const sd = sceneData[i];
    sceneFrameMap.push({
      id: sd.id,
      startFrame: adjustedFrame,
      endFrame: adjustedFrame + sd.durationFrames,
    });
    chapters.push({
      label: sd.label,
      time: adjustedFrame / 30,
    });
    adjustedFrame += sd.durationFrames;
    const trans = transitions[i];
    if (trans) {
      adjustedFrame -= trans.durationFrames;
    }
  }

  const adjustedTotalFrames = adjustedFrame;
  const totalDuration = adjustedTotalFrames / 30;

  // ── BGM volume curve ──
  const bgmCurve = config.audio.bgm
    ? generateBgmCurve(structure, config.audio.voiceover, totalDuration)
    : [];

  // ── 构建 TransitionSeries children ──
  const seriesChildren: React.ReactNode[] = [];

  for (let i = 0; i < sceneData.length; i++) {
    const sd = sceneData[i];
    const SceneComponent = sceneRegistry[sd.type];
    if (!SceneComponent) continue;

    seriesChildren.push(
      <TransitionSeries.Sequence key={sd.id} durationInFrames={sd.durationFrames}>
        <SceneComponent
          content={sd.config.content}
          chartData={sd.config.chartData}
          staggerOrder={sd.config.content?.staggerOrder as string[] | undefined}
          cameraAction={sd.config.cameraAction}
          wrapperType={sd.config.wrapperType}
          style={style}
          bgType={config.bgType}
          layoutId={sd.config.layoutId}
          motionMap={sd.config.motionMap}
          transitionIn={sd.config.transitionIn}
          transitionOut={sd.config.transitionOut}
        />
      </TransitionSeries.Sequence>,
    );

    if (i < sceneData.length - 1) {
      const trans = transitions[i];
      if (trans) {
        seriesChildren.push(
          <TransitionSeries.Transition
            key={`t-${sd.id}`}
            timing={linearTiming({ durationInFrames: trans.durationFrames })}
            presentation={trans.presentation as any}
          />,
        );
      } else {
        // No transition = hard cut; insert a zero-duration transition
        seriesChildren.push(
          <TransitionSeries.Transition
            key={`t-${sd.id}`}
            timing={linearTiming({ durationInFrames: 0 })}
            presentation={{ component: TransparentPresentation, props: {} } as any}
          />,
        );
      }
    }
  }

  return (
    <AbsoluteFill>
      <TransitionSeries>
        {seriesChildren}
      </TransitionSeries>

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
          <Audio key={`vo-${vi}`} src={staticFile(v.src)} from={startFrame} durationInFrames={durFrames} />
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

/** Invisible presentation — renders children without any transition effect */
const TransparentPresentation: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => <AbsoluteFill>{children}</AbsoluteFill>;

// ═══════════════════════════════════════════════════════════════
//  Transition mapping helpers
// ═══════════════════════════════════════════════════════════════

function buildTransitionPresentation(
  _prevOut: TransitionConfig | undefined,
  nextIn: TransitionConfig | undefined,
): { presentation: object; durationFrames: number } | null {
  const config = nextIn;
  if (!config || config.type === "none") return null;

  const durationFrames = config.durationFrames;

  switch (config.type) {
    case "crossfade":
      return { presentation: fade({ shouldFadeOutExitingScene: true }), durationFrames };
    case "slide-in": {
      const dir = mapSlideDirection(config.direction);
      return { presentation: slide({ direction: dir }), durationFrames };
    }
    case "slide-out": {
      // slide-out as incoming: incoming appears from opposite direction
      const opp = oppositeDirection(config.direction);
      const dir = mapSlideDirection(opp);
      return { presentation: slide({ direction: dir }), durationFrames };
    }
    case "whip-pan":
      return { presentation: whipPan({ direction: config.direction ?? "left" }), durationFrames };
    default:
      return null;
  }
}

function mapSlideDirection(dir?: TransitionDirection): "from-left" | "from-right" | "from-top" | "from-bottom" {
  switch (dir) {
    case "left": return "from-left";
    case "right": return "from-right";
    case "up": return "from-top";
    case "down": return "from-bottom";
    default: return "from-left";
  }
}

function oppositeDirection(dir?: TransitionDirection): TransitionDirection {
  switch (dir) {
    case "left": return "right";
    case "right": return "left";
    case "up": return "down";
    case "down": return "up";
    default: return "left";
  }
}

/** Map layout type to scene type for timeline-adaptive structures */
function layoutTypeToSceneType(layoutId: string): "hook" | "solution" | "feature" | "proof" | "showcase" {
  const hookLayouts = new Set(["hero-center", "kinetic-typography", "full-screen-text"]);
  const solutionLayouts = new Set(["split-left-text", "split-right-text"]);
  const featureLayouts = new Set(["card-grid", "floating-grid"]);
  const proofLayouts = new Set(["stat-highlight"]);

  if (hookLayouts.has(layoutId)) return "hook";
  if (solutionLayouts.has(layoutId)) return "solution";
  if (featureLayouts.has(layoutId)) return "feature";
  if (proofLayouts.has(layoutId)) return "proof";
  return "showcase";
}
