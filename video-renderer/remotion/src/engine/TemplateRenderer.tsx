import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import type { Blueprint } from "./types";
import { SceneRenderer } from "./SceneRenderer";
import { ElementRenderer } from "./ElementRenderer";
import { backgroundRegistry } from "../registries/backgroundRegistry";
import { transitionRegistry } from "../registries/transitionRegistry";
import { SubtitleOverlay } from "../components/content/SubtitleOverlay";

interface Props {
  blueprint: Blueprint;
}

export const TemplateRenderer: React.FC<Props> = ({ blueprint }) => {
  const { globalSettings, globalBackground, globalOverlays, scenes, data } = blueprint;
  const { fps } = useVideoConfig();

  const sorted = [...scenes].sort((a, b) => a.startFrame - b.startFrame);
  const dataCtx = (data ?? {}) as Record<string, unknown>;
  const motionTokens = globalSettings.motionTokens;

  // Resolve global background
  let GlobalBg: React.FC<any> | null = null;
  let globalBgProps: Record<string, unknown> = {};
  if (globalBackground && globalBackground.type !== "none") {
    GlobalBg = backgroundRegistry[globalBackground.type] ?? null;
    globalBgProps = globalBackground.props ?? {};
  }

  // ── Audio ducking: compute BGM volume per frame ──
  const ducking = globalSettings.audio?.ducking;
  const bgmVolumeFn = useMemo(() => {
    if (!ducking?.enabled) return undefined;
    const duckTo = ducking.duckToVolume ?? 0.1;
    const fade = ducking.fadeDurationFrames ?? 10;
    const baseVol = globalSettings.audio?.bgmVolume ?? 1;

    // Build a list of [startFrame, endFrame] voiceover intervals (global coords)
    let totalOffset = 0;
    const voiceIntervals: [number, number][] = [];
    for (const s of sorted) {
      if (s.voiceover?.audioUrl) {
        const start = totalOffset + s.voiceover.startFrame;
        const end = s.voiceover.endFrame
          ? totalOffset + s.voiceover.endFrame
          : totalOffset + s.durationInFrames;
        voiceIntervals.push([start, end]);
      }
      totalOffset += s.durationInFrames;
    }

    return (frame: number): number => {
      let vol = baseVol;
      for (const [vs, ve] of voiceIntervals) {
        if (frame >= vs - fade && frame < ve + fade) {
          if (frame < vs) {
            // Fading down
            vol = baseVol - (baseVol - duckTo) * ((frame - (vs - fade)) / fade);
          } else if (frame >= ve) {
            // Fading up
            vol = duckTo + (baseVol - duckTo) * ((frame - ve) / fade);
          } else {
            vol = duckTo;
          }
          vol = Math.max(duckTo, Math.min(baseVol, vol));
          break; // First matching voiceover wins
        }
      }
      return vol;
    };
  }, [ducking, globalSettings.audio?.bgmVolume, sorted]);

  // Build TransitionSeries children
  const seriesChildren: React.ReactNode[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const scene = sorted[i];

    seriesChildren.push(
      <TransitionSeries.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
        {/* Scene visual content */}
        <SceneRenderer
          scene={scene}
          globalBackground={globalBackground}
          dataCtx={dataCtx}
          motionTokens={motionTokens}
        />

        {/* Per-scene voiceover */}
        {scene.voiceover?.audioUrl && (
          <Audio
            src={scene.voiceover.audioUrl}
            volume={scene.voiceover.volume ?? 1}
            loop={scene.voiceover.loop}
            {...(scene.voiceover.endFrame
              ? { trimAfter: scene.voiceover.endFrame * (1 / fps) }
              : {})}
          />
        )}

        {/* Per-scene subtitles */}
        {scene.subtitles?.tokens && scene.subtitles.tokens.length > 0 && (
          <SubtitleOverlay
            tokens={scene.subtitles.tokens}
            highlightColor={scene.subtitles.highlightColor}
            fontSize={scene.subtitles.fontSize}
          />
        )}

        {/* Per-scene SFX triggers */}
        {scene.sfx?.map((trigger, j) => {
          const sfxUrl = globalSettings.audio?.sfx?.[trigger.sfx];
          if (!sfxUrl) return null;
          return (
            <AbsoluteFill key={`${scene.id}-sfx-${j}`} style={{ pointerEvents: "none" }}>
              <React.Fragment>
                <Audio src={sfxUrl} volume={trigger.volume ?? 1} />
              </React.Fragment>
            </AbsoluteFill>
          );
        })}
      </TransitionSeries.Sequence>
    );

    // Transition between scenes
    const t = scene.transitionToNext;
    if (t && t.type !== "none" && i < sorted.length - 1) {
      const presentation = transitionRegistry[t.type];
      if (presentation) {
        seriesChildren.push(
          <TransitionSeries.Transition
            key={`${scene.id}--transition`}
            presentation={presentation()}
            timing={linearTiming({ durationInFrames: t.durationInFrames })}
          />
        );
      }
    }
  }

  // ── Safe area CSS variables ──
  const safeAreaVars: React.CSSProperties = {};
  if (globalSettings.safeArea) {
    const sa = globalSettings.safeArea;
    const unit = sa.unit === "%" ? "%" : "px";
    (safeAreaVars as any)["--safe-top"] = `${sa.top}${unit}`;
    (safeAreaVars as any)["--safe-right"] = `${sa.right}${unit}`;
    (safeAreaVars as any)["--safe-bottom"] = `${sa.bottom}${unit}`;
    (safeAreaVars as any)["--safe-left"] = `${sa.left}${unit}`;
  }

  return (
    <AbsoluteFill
      className="font-display text-foreground"
      style={{
        backgroundColor: globalSettings.theme.colors.background,
        color: globalSettings.theme.colors.foreground,
        "--font-display": `"${globalSettings.theme.typography.primaryFont}", ${globalSettings.theme.typography.fallbackFont ?? "sans-serif"}`,
        ...Object.fromEntries(Object.entries(globalSettings.theme.colors).map(([k, v]) => [`--color-${k}`, v])),
        ...Object.fromEntries(Object.entries(globalSettings.theme.shape?.radii ?? {}).map(([k, v]) => [`--radius-${k}`, v])),
        ...Object.fromEntries(Object.entries(globalSettings.theme.shape?.shadows ?? {}).map(([k, v]) => [`--shadow-${k}`, v])),
        ...safeAreaVars,
      } as React.CSSProperties}
    >
      {/* Global BGM with ducking */}
      {globalSettings.audio?.bgmUrl && (
        <Audio
          src={globalSettings.audio.bgmUrl}
          volume={bgmVolumeFn ?? globalSettings.audio.bgmVolume ?? 1}
        />
      )}

      {/* Layer 0: Global background */}
      {GlobalBg && <GlobalBg {...globalBgProps} />}

      {/* Layer 1: Scene sequences with @remotion/transitions */}
      <TransitionSeries>
        {seriesChildren}
      </TransitionSeries>

      {/* Layer 2: Global overlays */}
      {globalOverlays?.map((overlay) => (
        <ElementRenderer
          key={overlay.id}
          element={overlay}
          dataCtx={dataCtx}
          motionTokens={motionTokens}
        />
      ))}
    </AbsoluteFill>
  );
};
