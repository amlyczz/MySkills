import React from "react";
import { AbsoluteFill } from "remotion";
import { DarkNeonBg } from "./backgrounds/DarkNeonBg";

/**
 * DarkNeon-Showcase
 * 仅作为 DarkNeonBg 背景组件的预览入口。
 * 在其他模板中直接使用 <DarkNeonBg /> 作为底层背景即可。
 */
export const DarkNeonShowcase: React.FC = () => (
  <AbsoluteFill>
    <DarkNeonBg />
  </AbsoluteFill>
);
