import React, { type ReactNode } from "react";
import { Img } from "remotion";
import { Video } from "@remotion/media";

interface Props {
  mediaSrc: string;
  mediaType?: "image" | "video";
  children?: ReactNode;
  ratio?: "5:5" | "4:6" | "6:4";
  className?: string;
}

const ratioMap = { "5:5": "1fr 1fr", "4:6": "4fr 6fr", "6:4": "6fr 4fr" };

export const SplitMedia: React.FC<Props> = ({
  mediaSrc,
  mediaType = "image",
  children,
  ratio = "5:5",
  className,
}) => (
  <div
    className={`w-full h-full grid items-center gap-16 px-[100px] py-[80px] ${className || ""}`}
    style={{ gridTemplateColumns: ratioMap[ratio] }}
  >
    <div className="w-full h-full rounded-[var(--radius-lg,24px)] overflow-hidden flex items-center justify-center">
      {mediaType === "video" ? (
        <Video src={mediaSrc} className="w-full h-full object-cover" />
      ) : (
        <Img src={mediaSrc} className="w-full h-full object-cover" />
      )}
    </div>
    <div className="w-full h-full flex flex-col justify-center">{children}</div>
  </div>
);
