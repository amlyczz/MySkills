import React from "react";

interface Props {
  title: string;
  artist: string;
  color: string;
  className?: string;
}

/**
 * AlbumCard — Dumb Component. Displays an album cover with title and artist.
 * No entrance animation (handled by ElementRenderer/animationRegistry).
 */
export const AlbumCard: React.FC<Props> = ({ title, artist, color, className }) => (
  <div
    className={`w-[180px] rounded-2xl overflow-hidden bg-[#1A1A1A] shadow-[0_8px_32px_rgba(0,0,0,0.4)] shrink-0 font-sans ${className || ""}`}
  >
    <div
      className="w-full aspect-square flex items-center justify-center text-5xl"
      style={{ background: color }}
    >
      🎵
    </div>
    <div className="px-4 py-3">
      <div className="text-white font-bold text-sm">{title}</div>
      <div className="text-[#B3B3B3] text-xs mt-1">{artist}</div>
    </div>
  </div>
);
