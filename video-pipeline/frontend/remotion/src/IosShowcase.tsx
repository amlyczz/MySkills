import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { IPhoneFrame } from "./components/layout/IPhoneFrame";
import { IOSStatusBar } from "./components/content/IOSStatusBar";
import { IOSNavBar } from "./components/content/IOSNavBar";
import { IOSListItem } from "./components/content/IOSListItem";

const SlideIn: React.FC<{ children: React.ReactNode; index: number }> = ({ children, index }) => {
  const frame = useCurrentFrame();
  const start = index * 5;
  const opacity = interpolate(frame, [start, start + 10], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [start, start + 15], [20, 0], { extrapolateRight: "clamp" });
  return <div style={{ opacity, transform: `translateY(${y}px)` }}>{children}</div>;
};

const items = [
  { icon: "🐛", title: "Bug Fixer", subtitle: "Automatically fix minor code issues", iconBg: "#E8F2FF" },
  { icon: "📅", title: "Calendar Buddy", subtitle: "Keep your calendar organized", iconBg: "#FFE8F2" },
  { icon: "✉️", title: "Email Drafter", subtitle: "Draft professional emails instantly", iconBg: "#E8F5E9" },
  { icon: "🔍", title: "Code Reviewer", subtitle: "Review PRs with AI assistance", iconBg: "#FFF3E0" },
  { icon: "📊", title: "Report Builder", subtitle: "Generate visual reports in seconds", iconBg: "#F3E5F5" },
];

const tools = [
  { icon: "🔗", label: "Notion" },
  { icon: "💬", label: "Slack" },
  { icon: "🤖", label: "Claude" },
  { icon: "📝", label: "Linear" },
  { icon: "📁", label: "Drive" },
  { icon: "🎨", label: "Figma" },
];

const HomeScreen: React.FC = () => (
  <div style={{ paddingBottom: 20 }}>
    <IOSStatusBar />
    <div style={{ padding: "12px 16px", fontSize: 28, fontWeight: 700, color: "#000" }}>Skills</div>
    <IOSNavBar tabs={["All", "Productivity", "Developer", "Creative"]} activeTab={0} />
    <div style={{ padding: "0 16px", marginTop: 8 }}>
      <div style={{ fontSize: 13, color: "#86868B", fontWeight: 500, marginBottom: 8, paddingLeft: 4 }}>RECENT</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {["🐛", "📅", "✉️"].map((icon, i) => (
          <div key={i} style={{
            width: 72, height: 72, borderRadius: 16,
            background: ["#E8F2FF", "#FFE8F2", "#E8F5E9"][i],
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>{icon}</div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: "#86868B", fontWeight: 500, marginBottom: 8, paddingLeft: 4 }}>ALL SKILLS</div>
    </div>
  </div>
);

const HomeScene: React.FC = () => (
  <IPhoneFrame>
    <HomeScreen />
    {items.map((item, i) => (
      <SlideIn key={i} index={i + 2}>
        <IOSListItem {...item} />
      </SlideIn>
    ))}
  </IPhoneFrame>
);

const DetailScreen: React.FC = () => (
  <IPhoneFrame>
    <IOSStatusBar />
    <div style={{ display: "flex", alignItems: "center", padding: "16px" }}>
      <span style={{ fontSize: 18 }}>←</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 18, marginRight: 12 }}>􀈂</span>
      <span style={{ fontSize: 18 }}>􀍡</span>
    </div>
    <div style={{ textAlign: "center", padding: "0 24px" }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20, margin: "0 auto 12px",
        background: "#F5F0EB", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36,
      }}>🤖</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>Team Helper</div>
      <div style={{ fontSize: 14, color: "#86868B", marginTop: 4 }}>AI-powered team coordination</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#000", borderBottom: "2px solid #0071E3", paddingBottom: 4 }}>About</span>
        <span style={{ fontSize: 14, color: "#86868B" }}>Activity</span>
        <span style={{ fontSize: 14, color: "#86868B" }}>Settings</span>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 20 }}>
      {tools.map((tool, i) => (
        <SlideIn key={i} index={i}>
          <div style={{
            background: "#F5F5F7", borderRadius: 14, padding: 16,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 28 }}>{tool.icon}</span>
            <span style={{ fontSize: 12, color: "#86868B", fontWeight: 500 }}>{tool.label}</span>
          </div>
        </SlideIn>
      ))}
    </div>
  </IPhoneFrame>
);

export const IosShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const phone1Fade = spring({ frame, fps, config: { damping: 14 } });
  const phone1Y = interpolate(phone1Fade, [0, 1], [50, 0]);

  const phone2Fade = spring({ frame: Math.max(0, frame - 40), fps, config: { damping: 14 } });
  const phone2Y = interpolate(phone2Fade, [0, 1], [50, 0]);

  // When phone2 enters, phone1 shifts left so they are centered together
  const phone1XSpring = spring({ frame: Math.max(0, frame - 35), fps, config: { damping: 14 } });
  const shiftX = interpolate(phone1XSpring, [0, 1], [0, -220]); 

  return (
    <AbsoluteFill style={{ background: "#F5F5F7" }}>
      <Sequence from={0} durationInFrames={180}>
        <div style={{
          position: "absolute",
          left: 780 + shiftX,
          top: 130,
          transform: `scale(1.1) translateY(${phone1Y}px)`,
          opacity: phone1Fade,
        }}>
          <HomeScene />
        </div>
      </Sequence>
      <Sequence from={40} durationInFrames={140}>
        <div style={{
          position: "absolute",
          left: 780 + 220,
          top: 130,
          transform: `scale(1.1) translateY(${phone2Y}px)`,
          opacity: phone2Fade,
        }}>
          <DetailScreen />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
