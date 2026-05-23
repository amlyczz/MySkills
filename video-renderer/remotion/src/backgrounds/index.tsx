import React from "react";
import { Starfield, BackgroundProps } from "./Starfield";
import { BokehCircles } from "./BokehCircles";
import { GeometricPatterns } from "./GeometricPatterns";
import { PixelTransition } from "./PixelTransition";
import { FluidGradient } from "./FluidGradient";
import { Nebula3D } from "./Nebula3D";
import { Aurora } from "./Aurora";

export type { BackgroundProps } from "./Starfield";

export type BgType = "starfield" | "bokeh" | "geometric" | "pixel" | "fluid-gradient" | "nebula-3d" | "aurora";

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
    case "fluid-gradient":
      return <FluidGradient />;
    case "nebula-3d":
      return <Nebula3D {...props} />;
    case "aurora":
      return <Aurora {...props} />;
    default:
      return <FluidGradient />;
  }
};
