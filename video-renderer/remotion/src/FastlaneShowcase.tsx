import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const ChatBubble: React.FC<{ msg: string; user?: boolean; delay: number }> = ({ msg, user, delay }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 15, stiffness: 150 } });
  return (
    <div style={{ display: "flex", justifyContent: user ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div style={{
        maxWidth: "75%", padding: "12px 18px",
        borderRadius: user ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
        background: user ? "linear-gradient(135deg, #FF6B6B, #EE5A24)" : "#FFF",
        color: user ? "#FFF" : "#1E293B",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)", fontSize: 15, lineHeight: 1.5,
        fontFamily: "Inter, sans-serif",
        opacity: s, transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
      }}>{msg}</div>
    </div>
  );
};

const ContentCalendar: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp" });
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const posts = [3, 7, 12, 18, 25];
  return (
    <div style={{ width: 600, background: "#FFF", borderRadius: 20, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", opacity: o, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#1E293B" }}>May 2026</span>
        <span style={{ background: "#FEF2F2", color: "#DC2626", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>CONTENT CALENDAR · {posts.length} POSTS</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, textAlign: "center" }}>
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(d => <div key={d} style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{d}</div>)}
        {days.map(d => <div key={d} style={{ aspectRatio: "1", borderRadius: 8, background: posts.includes(d) ? "#FEF2F2" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: posts.includes(d) ? 700 : 400, color: posts.includes(d) ? "#DC2626" : "#64748B" }}>{d}{posts.includes(d) && <div style={{ display: "flex", gap: 2, marginTop: 3 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: ["#DC2626", "#F59E0B", "#10B981"][i] }} />)}</div>}</div>)}
      </div>
    </div>
  );
};

export const FastlaneShowcase: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={140}>
      <AbsoluteFill style={{ background: "linear-gradient(135deg, #FEF3F2, #FFF, #FDF2F8)", justifyContent: "center", alignItems: "center", gap: 20 }}>
        <div style={{ fontSize: 42, fontWeight: 700, color: "#1E293B", fontFamily: "Inter, sans-serif", textAlign: "center" }}>Content planning,<br />automated.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 500 }}>
          <ChatBubble msg="Create a content calendar for May" user delay={10} />
          <ChatBubble msg="Sure! I've drafted your content calendar with 5 posts optimized for engagement." user={false} delay={25} />
          <ChatBubble msg="Looks great! Schedule them all." user delay={40} />
          <ChatBubble msg="Done ✓ All 5 posts scheduled. You'll get preview notifications before each goes live." user={false} delay={55} />
        </div>
      </AbsoluteFill>
    </Sequence>
    <Sequence from={120} durationInFrames={140}>
      <AbsoluteFill style={{ background: "linear-gradient(135deg, #FEF3F2, #FFF, #FDF2F8)", justifyContent: "center", alignItems: "center" }}>
        <ContentCalendar />
      </AbsoluteFill>
    </Sequence>
  </>
);
