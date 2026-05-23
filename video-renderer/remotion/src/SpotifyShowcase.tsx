import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { StarParticles } from "./components/StarParticles";

const SpotifyLogo: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const o = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp" });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <span style={{ fontSize: 80, fontWeight: 900, color: "#FFF", letterSpacing: "-2px", opacity: o }}>Sp</span>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#1DB954", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s})`, margin: "0 4px" }}>
        <svg width="35" height="35" viewBox="0 0 24 24" fill="#000"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 13.19c-.18.29-.54.38-.83.2-2.27-1.39-5.12-1.71-8.46-.95-.32.07-.64-.13-.71-.45-.07-.32.13-.64.45-.71 3.66-.83 6.82-.47 9.35 1.07.29.18.38.54.2.83z" /></svg>
      </div>
      <span style={{ fontSize: 80, fontWeight: 900, color: "#FFF", letterSpacing: "-2px", opacity: o }}>tify</span>
    </div>
  );
};

const DecorativeBorder: React.FC = () => (
  <>
    {[20, 1040].map(top => (
      <div key={top} style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "space-around", padding: "0 40px" }}>
        {Array.from({ length: 40 }, (_, i) => (
          <div key={i} style={{ width: 10, height: 10, background: "#FFD700", borderRadius: 2, transform: "rotate(45deg)" }} />
        ))}
      </div>
    ))}
  </>
);

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
    <Sequence from={0} durationInFrames={180}>
      <AbsoluteFill style={{ background: "#000" }}>
        <StarParticles count={40} /><DecorativeBorder />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}><SpotifyLogo /></AbsoluteFill>
      </AbsoluteFill>
    </Sequence>
    <Sequence from={160} durationInFrames={200}>
      <AbsoluteFill style={{ background: "#1A1A1A", justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 900 }}>
          {[{ title: "Starboy", artist: "The Weeknd", color: "#E8115B" }, { title: "Rave & Roses", artist: "Rema", color: "#1DB954" }, { title: "Un Verano", artist: "Bad Bunny", color: "#FFD700" }, { title: "Midnights", artist: "Taylor Swift", color: "#5856D6" }].map((a, i) => <AlbumCard key={i} {...a} delay={i * 10} />)}
        </div>
      </AbsoluteFill>
    </Sequence>
  </>
);
