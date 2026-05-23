import React from "react";
import { AbsoluteFill } from "remotion";

export const DotGridBg: React.FC = () => (
  <AbsoluteFill style={{
    backgroundColor: "#F5F5F7",
    backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
    backgroundSize: "24px 24px",
  }} />
);
