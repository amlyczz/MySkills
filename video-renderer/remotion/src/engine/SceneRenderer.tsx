import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneConfig, BackgroundType, MotionToken } from "./types";
import { GenericScene } from "./GenericScene";
import { presetSceneRegistry } from "../registries/sceneRegistry";
import { backgroundRegistry } from "../registries/backgroundRegistry";

interface Props {
  scene: SceneConfig;
  globalBackground?: { type: BackgroundType; props?: Record<string, unknown> };
  dataCtx?: Record<string, unknown>;
  motionTokens?: Record<string, MotionToken>;
}

export const SceneRenderer: React.FC<Props> = ({ scene, globalBackground, dataCtx, motionTokens }) => {
  const bgConfig = scene.background !== undefined ? scene.background : globalBackground;
  let BgComponent: React.FC<any> | null = null;
  let bgProps: Record<string, unknown> = {};

  if (bgConfig && bgConfig.type !== "none") {
    BgComponent = backgroundRegistry[bgConfig.type] ?? null;
    bgProps = bgConfig.props ?? {};
  }

  return (
    <AbsoluteFill style={scene.style}>
      {BgComponent && <BgComponent {...bgProps} />}

      {scene.type === "generic" ? (
        <GenericScene elements={scene.elements ?? []} style={scene.style} dataCtx={dataCtx} motionTokens={motionTokens} />
      ) : (
        (() => {
          const PresetComponent = presetSceneRegistry[scene.type];
          if (!PresetComponent) {
            console.warn(`[SceneRenderer] Unknown preset scene type: "${scene.type}".`);
            return null;
          }
          return <PresetComponent {...(scene.props ?? {})} />;
        })()
      )}
    </AbsoluteFill>
  );
};
