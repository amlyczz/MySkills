import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { BrowserMockup } from "./components/BrowserMockup";
import { KineticText } from "./components/KineticText";
import { SkillCard } from "./components/SkillCard";

const skills = [
  { title: "Protein maximizer", desc: "Modifies a recipe to maximize protein content while keeping flavor.", icon: "�" },
  { title: "Gift concierge", desc: "Assists with picking the perfect gift for any occasion.", icon: "🎁" },
  { title: "Meal planner", desc: "Builds a visual meal plan for the week with one click.", icon: "🍽️" },
  { title: "Travel assistant", desc: "Creates itineraries based on your preferences and budget.", icon: "✈️" },
  { title: "Code reviewer", desc: "Reviews your code and suggests improvements inline.", icon: "💻" },
  { title: "Email drafter", desc: "Drafts professional emails from a few bullet points.", icon: "✉️" },
];

const IntroScene: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#121212", justifyContent: "center", alignItems: "center" }}>
    <div style={{ position: "absolute", top: 100, width: "100%", height: 2, backgroundColor: "#333" }} />
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
      <Sequence from={0}>
        <KineticText text="NEW" outlined delay={0} />
      </Sequence>
      <Sequence from={8}>
        <KineticText text="NEW" delay={8} style={{ color: "#4285F4" }} />
      </Sequence>
      <Sequence from={16}>
        <KineticText text="NEW" outlined delay={16} />
      </Sequence>
    </div>
    <Sequence from={40}>
      <div style={{
        fontSize: 42, fontWeight: 700, color: "#fff",
        fontFamily: "Inter, sans-serif", marginTop: 40,
        opacity: 1, letterSpacing: "-0.01em",
      }}>
        Prompt like a pro
      </div>
    </Sequence>
  </AbsoluteFill>
);

const UiScene: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#F8F9FA", justifyContent: "center", alignItems: "center" }}>
    <BrowserMockup url="chrome://skills">
      <div style={{ padding: 40, display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
        {skills.map((skill, i) => (
          <Sequence key={i} from={10 + i * 12}>
            <SkillCard {...skill} delay={10 + i * 12} />
          </Sequence>
        ))}
      </div>
    </BrowserMockup>
  </AbsoluteFill>
);

export const SaasLaunchShowcase: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={100}>
      <IntroScene />
    </Sequence>
    <Sequence from={80} durationInFrames={160}>
      <UiScene />
    </Sequence>
  </>
);
