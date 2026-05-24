import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";

const AlbumCard: React.FC<{ title: string; artist: string; color: string; delay: number }> = ({ title, artist, color, delay }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ width: 180, borderRadius: 16, overflow: "hidden", background: "#1A1A1A", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", transform: `scale(${0.8 + 0.2 * s})`, opacity: s, flexShrink: 0 }}>
      <div style={{ width: "100%", aspectRatio: "1", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🎵</div>
      <div style={{ padding: "12px 16px" }}><div style={{ color: "#FFF", fontWeight: 700, fontSize: 14 }}>{title}</div><div style={{ color: "#B3B3B3", fontSize: 12, marginTop: 4 }}>{artist}</div></div>
    </div>
  );
};

export const SpotifyShowcase: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={200}>
      <AbsoluteFill style={{ background: "#1A1A1A", justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 900 }}>
          {[{ title: "Starboy", artist: "The Weeknd", color: "#E8115B" }, { title: "Rave & Roses", artist: "Rema", color: "#1DB954" }, { title: "Un Verano", artist: "Bad Bunny", color: "#FFD700" }, { title: "Midnights", artist: "Taylor Swift", color: "#5856D6" }].map((a, i) => <AlbumCard key={i} {...a} delay={i * 10} />)}
        </div>
      </AbsoluteFill>
    </Sequence>
  </>
);
