import React from "react";
import { Starfield, BackgroundProps } from "./Starfield";
import { BokehCircles } from "./BokehCircles";
import { GeometricPatterns } from "./GeometricPatterns";
import { PixelTransition } from "./PixelTransition";

export type { BackgroundProps } from "./Starfield";

export type BgType = "starfield" | "bokeh" | "geometric" | "pixel";

interface BackgroundLayerProps extends BackgroundProps {
  bgType: BgType;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({
  bgType,
  ...props
}) => {
  switch (bgType) {
    case "starfield":
      return <Starfield {...props} />;
    case "bokeh":
      return <BokehCircles {...props} />;
    case "geometric":
      return <GeometricPatterns {...props} />;
    case "pixel":
      return <PixelTransition {...props} />;
    default:
      return <Starfield {...props} />;
  }
};
