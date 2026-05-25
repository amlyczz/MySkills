import React from "react";
import { Sequence } from "remotion";
import { sceneRegistry } from "./scenes";
import { cohereConfig } from "./data/cohere-showcase.config";

/**
 * Cohere Command A+ Showcase — Data-driven composition.
 *
 * All scene content is defined in data/cohere-showcase.config.ts (single source of truth).
 * This component maps each config entry to its registered scene component via sceneRegistry,
 * and wraps it in a <Sequence> for timeline isolation.
 *
 * Architecture: Config → sceneRegistry → Sequence → Scene Component
 */
export const CohereShowcase: React.FC = () => {
  const { scenes } = cohereConfig;

  return (
    <>
      {scenes.map((scene, i) => {
        const Component = sceneRegistry[scene.type] as unknown as React.FC<Record<string, unknown>>;
        return (
          <Sequence
            key={i}
            from={scene.from}
            durationInFrames={scene.duration}
          >
            <Component {...scene.props} />
          </Sequence>
        );
      })}
    </>
  );
};
