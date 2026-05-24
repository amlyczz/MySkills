import React from "react";
import type { Blueprint } from "./types";
import { TemplateRenderer } from "./TemplateRenderer";

interface Props {
  blueprintJson: string;
}

/**
 * VideoComposer — Generic pipeline entry point.
 * Accepts a Blueprint JSON string as a prop, parses it,
 * and delegates rendering to TemplateRenderer.
 *
 * Usage (CLI):
 *   npx remotion render VideoComposer --props='{"blueprintJson":"$(cat blueprint.json | jq -c .)"}'
 */
export const VideoComposer: React.FC<Props> = ({ blueprintJson }) => {
  let blueprint: Blueprint;
  try {
    blueprint = JSON.parse(blueprintJson);
  } catch {
    return (
      <div style={{
        width: "100%", height: "100%",
        background: "#ff0000", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 48, fontFamily: "monospace",
      }}>
        ❌ Invalid Blueprint JSON
      </div>
    );
  }

  return <TemplateRenderer blueprint={blueprint} />;
};
