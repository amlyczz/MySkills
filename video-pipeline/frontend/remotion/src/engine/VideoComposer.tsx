import React, { useEffect, useState } from "react";
import { staticFile, useVideoConfig } from "remotion";
import type { Blueprint } from "./types";
import { TemplateRenderer } from "./TemplateRenderer";

interface Props {
  blueprintJson: string;
}

export const VideoComposer: React.FC<Props> = ({ blueprintJson }) => {
  const { fps } = useVideoConfig();
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);

  useEffect(() => {
    // Try to parse the prop first
    if (blueprintJson && blueprintJson !== "{}") {
      try {
        setBlueprint(JSON.parse(blueprintJson));
        return;
      } catch {
        // Fall through to fetch
      }
    }

    // Fallback: fetch preview.json written by the pipeline
    fetch(staticFile("preview.json"))
      .then((r) => {
        if (!r.ok) throw new Error("no preview");
        return r.json();
      })
      .then((data) => setBlueprint(data))
      .catch(() => setBlueprint(null));
  }, [blueprintJson]);

  if (!blueprint) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#111",
          color: "#666",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          fontFamily: "monospace",
        }}
      >
        No blueprint loaded
      </div>
    );
  }

  return <TemplateRenderer blueprint={blueprint} />;
};
