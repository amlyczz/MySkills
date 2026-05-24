import type { Blueprint } from "../engine/types";

export const spotifyBlueprint: Blueprint = {
  meta: { id: "spotify", name: "Spotify Showcase" },
  globalSettings: {
    
    
    theme: {
      colors: {
        primary: "#1DB954",
        background: "#1A1A1A",
        surface: "#282828",
        foreground: "#FFFFFF",
      },
      typography: {
        primaryFont: "Inter",
        scales: { h1: "32px", body: "14px" },
      },
      shape: {
        radii: { lg: "16px" },
        shadows: { md: "0 8px 32px rgba(0,0,0,0.4)" },
      },
    },
  },
  scenes: [
    {
      id: "albums",
      type: "generic",
      startFrame: 0,
      durationInFrames: 200,
      style: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      },
      elements: [
        {
          id: "album-row",
          type: "div",
          props: {
            style: {
              display: "flex",
              gap: 20,
              flexWrap: "wrap" as const,
              justifyContent: "center",
              maxWidth: 900,
            },
          },
          children: [
            {
              id: "album-0",
              type: "album-card",
              props: { title: "Starboy", artist: "The Weeknd", color: "#E8115B" },
              animation: { type: "scale-bounce", timeline: { inFrame: 0 } },
            },
            {
              id: "album-1",
              type: "album-card",
              props: { title: "Rave & Roses", artist: "Rema", color: "#1DB954" },
              animation: { type: "scale-bounce", timeline: { inFrame: 10 } },
            },
            {
              id: "album-2",
              type: "album-card",
              props: { title: "Un Verano", artist: "Bad Bunny", color: "#FFD700" },
              animation: { type: "scale-bounce", timeline: { inFrame: 20 } },
            },
            {
              id: "album-3",
              type: "album-card",
              props: { title: "Midnights", artist: "Taylor Swift", color: "#5856D6" },
              animation: { type: "scale-bounce", timeline: { inFrame: 30 } },
            },
          ],
        },
      ],
    },
  ],
};
