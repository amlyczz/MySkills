import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Img } from "remotion";
import { Video } from "@remotion/media";
import { LayoutProps } from "../types";
import { FONT_SIZE_TITLE, FONT_WEIGHT_TITLE } from "../layout";
import { SPRING_ELASTIC_UI } from "../motions";

interface EntityDef {
  type: string;
  name: string;
  thumb?: string;
}

export const PromptInput: React.FC<LayoutProps> = ({
  title,
  subtitle,
  style,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rawPrompt = (title as string) || "";
  let entities: Record<string, EntityDef> = {};
  try {
    entities = JSON.parse((subtitle as string) || "{}");
  } catch {}

  // Parse [entity_key] and normal text
  const tokens = useMemo(() => {
    const regex = /(\{[^}]+\})/g;
    const parts = rawPrompt.split(regex);
    let charOffset = 0;
    return parts.map(part => {
      const match = part.match(/^\{([^}]+)\}$/);
      const isEntity = !!match;
      const key = match ? match[1] : "";
      const textLen = isEntity ? 1 : part.length; // Entity counts as 1 "char" for typing speed
      const token = {
        isEntity,
        text: part,
        key,
        startChar: charOffset,
        endChar: charOffset + textLen,
      };
      charOffset += textLen;
      return token;
    });
  }, [rawPrompt]);

  const charsPerFrame = 0.5; // Typing speed
  const currentVisibleChars = frame * charsPerFrame;

  return (
    <AbsoluteFill
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: theme.typography.fontFamily, padding: 80,
      }}
    >
      <div
        style={{
          background: `rgba(255,255,255,${style.glassOpacity ?? 0.06})`,
          backdropFilter: `blur(${style.backdropBlur ?? 16}px)`,
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.15)",
          padding: "32px 48px",
          maxWidth: 900,
          display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 12,
          fontSize: FONT_SIZE_TITLE * 0.6,
          fontWeight: FONT_WEIGHT_TITLE,
          color: style.bodyColor,
          lineHeight: 1.5,
          boxShadow: "0 24px 80px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)",
        }}
      >
        {tokens.map((token, i) => {
          if (token.startChar > currentVisibleChars) {
            return null; // Not typed yet
          }

          if (token.isEntity) {
            const entity = entities[token.key];
            if (!entity) return <span key={i} style={{ opacity: 0.5 }}>{token.key}</span>;

            // Animate pill popup based on when it was "typed"
            const typedFrame = token.startChar / charsPerFrame;
            const progress = spring({
              frame: frame - typedFrame,
              fps,
              config: SPRING_ELASTIC_UI,
            });

            const scale = interpolate(progress, [0, 1], [0, 1]);
            const isVideo = entity.thumb?.endsWith(".mp4") || entity.thumb?.endsWith(".webm");

            return (
              <span
                key={i}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  background: `linear-gradient(135deg, rgba(66,133,244,0.3) 0%, rgba(66,133,244,0.1) 100%)`,
                  borderRadius: 32, padding: "8px 16px 8px 8px",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(66,133,244,0.4)",
                  transform: `scale(${scale})`,
                  transformOrigin: "left center",
                  margin: "0 4px",
                  verticalAlign: "middle",
                }}
              >
                {entity.thumb && (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: "#000" }}>
                    {isVideo ? (
                      <Video src={entity.thumb} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Img src={entity.thumb} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                )}
                <span style={{ color: "#8ab4f8", fontSize: "0.9em", letterSpacing: "-0.02em" }}>
                  @{entity.name}
                </span>
              </span>
            );
          }

          // Normal text: substring based on typing progress
          const visibleLen = Math.min(token.text.length, Math.floor(currentVisibleChars - token.startChar));
          return <span key={i}>{token.text.substring(0, visibleLen)}</span>;
        })}

        {/* Blinking cursor */}
        <span
          style={{
            display: "inline-block", width: 4, height: "1.2em",
            backgroundColor: style.primaryColor || "#4285f4",
            borderRadius: 2,
            opacity: Math.sin(frame * 0.4) > 0 ? 1 : 0.2,
            marginLeft: 4,
            verticalAlign: "middle",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
