import React from "react";

interface Props {
  title: string;
  channel: string;
  views: string;
  time: string;
  thumbnailColor?: string;
  className?: string;
}

export const VideoCard: React.FC<Props> = ({
  title,
  channel,
  views,
  time,
  thumbnailColor = "#E5E7EB",
  className,
}) => (
  <div className={`flex gap-4 mb-4 font-sans ${className || ""}`}>
    <div
      className="w-40 aspect-video rounded-xl shrink-0 flex items-center justify-center text-2xl text-gray-400"
      style={{ backgroundColor: thumbnailColor }}
    />
    <div className="flex-1 min-w-0 flex flex-col justify-center">
      <h4 className="m-0 mb-1 text-base font-medium leading-snug text-[#0F0F0F]">
        {title}
      </h4>
      <p className="m-0 text-sm text-[#606060]">
        {channel} &bull; {views} views &bull; {time}
      </p>
    </div>
  </div>
);
