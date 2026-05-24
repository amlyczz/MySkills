import React from "react";
import type { Blueprint } from "./types";
import { TemplateRenderer } from "./TemplateRenderer";

interface Props {
  blueprintJson: string;
}

export const VideoComposer: React.FC<Props> = ({ blueprintJson }) => {
  let blueprint: Blueprint;
  try {
    blueprint = JSON.parse(blueprintJson);
  } catch {
    return <div style={{width:"100%",height:"100%",background:"#f00",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,fontFamily:"monospace"}}>Invalid Blueprint JSON</div>;
  }
  return <TemplateRenderer blueprint={blueprint} />;
};
