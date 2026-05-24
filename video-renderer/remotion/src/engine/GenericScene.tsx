import React from "react";
import { AbsoluteFill } from "remotion";
import type { ElementConfig, MotionToken } from "./types";
import { ElementRenderer } from "./ElementRenderer";

interface Props {
  elements: ElementConfig[];
  style?: React.CSSProperties;
  dataCtx?: Record<string, unknown>;
  motionTokens?: Record<string, MotionToken>;
}

export const GenericScene: React.FC<Props> = ({ elements, style, dataCtx, motionTokens }) => (
  <AbsoluteFill style={{ fontFamily: "Inter, sans-serif", ...style }}>
    {elements.map((el) => (
      <ElementRenderer
        key={el.id}
        element={el}
        dataCtx={dataCtx ?? {}}
        motionTokens={motionTokens}
      />
    ))}
  </AbsoluteFill>
);
