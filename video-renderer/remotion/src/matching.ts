/**
 * matching.ts — 规则层匹配引擎。
 *
 * 纯函数，无副作用。输入 MatchingInput，输出 VideoConfig。
 * 用于 allocate.py 调用或 Remotion Studio 预览。
 *
 * 匹配链：matchStructure → matchStyle → matchLayout × N → matchMotion × N → matchAudio
 */
import {
  MatchingInput,
  VideoConfig,
  SceneConfig,
  LayoutType,
  MotionType,
  StyleFamily,
  BgmMood,
  AssetInfo,
} from "./types";
import { getStructure } from "./structures";
import { styleTemplates } from "./styles";
import { matchStyle as matchStyleFromMeta } from "./styleMeta";
import { defaultMotionMap } from "./motions";
import { getBgmByMood, toBgmTrack } from "./audio/bgmLibrary";
import { generateBgmCurve } from "./audio/bgmCurve";
import layoutsConfig from "./enums/layouts.json";

// ── 1. 结构匹配 ──

export function matchStructure(input: MatchingInput): string {
  // 有大量视频素材 → 产品展示型
  const videoCount = input.extractedVideos?.length ?? 0;
  if (videoCount >= 3) return "product-showcase";

  // 默认 → 漏斗型
  return "funnel";
}

// ── 2. 样式匹配 ──

export function matchStyle(
  input: MatchingInput,
): { styleId: string; bgType: import("./backgrounds").BgType } {
  return matchStyleFromMeta(input.language, input.topics);
}

// ── 3. 布局匹配 ──
// Source of truth: contracts/enums/layouts.json (synced to src/enums/layouts.json)

const defaultLayoutBySceneType: Record<string, LayoutType> =
  layoutsConfig.scene_type_default_layout as Record<string, LayoutType>;

export function matchLayout(sceneType: string, input: MatchingInput, sceneIndex: number): LayoutType {
  const hasVideos = (input.extractedVideos?.length ?? 0) > 0;
  const isDemoHeavy = (input.extractedVideos?.length ?? 0) >= 3;
  const hasManyPoints = (input.points?.length ?? 0) >= 4;

  if (sceneType === "hook") {
    if (input.title?.length > 40) return "kinetic-typography";
    if (hasVideos && isDemoHeavy) return "center-focus-video";
    return "hero-center";
  }
  
  if (sceneType === "problem") {
    return hasManyPoints ? "split-left-text" : "quote-style";
  }

  if (sceneType === "solution") {
    if (hasVideos && !isDemoHeavy) return "split-left-text";
    return "sandwich-text";
  }

  if (sceneType === "feature") {
    return hasManyPoints ? "card-grid" : "floating-grid";
  }

  if (sceneType === "showcase" || sceneType === "demo") {
    return isDemoHeavy ? "media-gallery" : "media-full";
  }

  if (sceneType === "proof") {
    return input.stats ? "stat-highlight" : "card-grid";
  }

  if (sceneType === "cta") {
    return "prompt-input";
  }

  return defaultLayoutBySceneType[sceneType] ?? "hero-center";
}

// ── 4. 动效匹配 ──

export function matchMotion(elementRole: string, layout: LayoutType, input: MatchingInput): MotionType {
  if (elementRole === "title" || elementRole === "headline") {
    if (layout === "kinetic-typography") return "typewriter";
    if (layout === "prompt-input") return "typewriter";
    // For aggressive/tech topics, use bounce-in
    const isTech = ["rust", "go", "c++", "c", "python"].includes(input.language?.toLowerCase() || "");
    return isTech ? "bounce-in" : "arc-entrance";
  }

  if (elementRole === "points") {
    if (layout === "card-grid") return "staggered-grow";
    return "spring-slide-up";
  }

  if (elementRole === "stats") {
    return "scale-fade";
  }

  return defaultMotionMap[elementRole] ?? "scale-fade";
}

// ── 5. 音频匹配 ──

const familyToMood: Record<StyleFamily, BgmMood> = {
  tech: "tech",
  business: "corporate",
  creative: "cinematic",
  minimal: "chill",
  playful: "upbeat",
};

export function matchBgmMood(styleId: string): BgmMood {
  const style = styleTemplates.find((s) => s.id === styleId);
  if (!style) return "chill";
  return familyToMood[style.family] ?? "chill";
}

// ── 6. 组合：生成完整 VideoConfig ──

export function generateVideoConfig(input: MatchingInput): VideoConfig {
  // 结构
  const structureId = matchStructure(input);
  const structure = getStructure(structureId);
  if (!structure) throw new Error(`Structure not found: ${structureId}`);

  // 样式
  const { styleId, bgType } = matchStyle(input);

  // 每个场景的配置
  const sceneConfigs: Record<string, SceneConfig> = {};
  for (let i = 0; i < structure.scenes.length; i++) {
    const scene = structure.scenes[i];
    const layoutId = matchLayout(scene.type, input, i);

    // 为场景中的每个内容槽位分配动效
    const motionMap: Record<string, MotionType> = {};
    for (const slot of scene.contentSlots) {
      motionMap[slot.name] = matchMotion(slot.name, layoutId, input);
    }

    // 填充内容（从 input 中提取）
    const content: Record<string, string | string[]> = fillContent(
      scene.type,
      scene.contentSlots,
      input,
    );

    sceneConfigs[scene.id] = { layoutId, motionMap, content };
  }

  // 音频
  const bgmMood = matchBgmMood(styleId);
  const bgmEntry = getBgmByMood(bgmMood);
  const bgm = bgmEntry ? toBgmTrack(bgmEntry) : undefined;

  return {
    structureId,
    styleId,
    bgType,
    sceneConfigs,
    audio: {
      bgm,
      sfxEnabled: true,
      voiceover: [],
      voiceoverEnabled: false,
    },
  };
}

// ── 内容填充 ──

function fillContent(
  sceneType: string,
  slots: { name: string; type: "text" | "media"; required: boolean }[],
  input: MatchingInput,
): Record<string, string | string[]> {
  const content: Record<string, string | string[]> = {};

  switch (sceneType) {
    case "hook":
      content.headline = input.title;
      break;

    case "problem":
      content.title = "Why This Matters";
      if (input.points.length > 0) {
        // 把前 2-3 个要点作为痛点
        content.points = input.points.slice(0, 3).map(
          (p) => `${p.replace(/^/, "• ")}`,
        );
      }
      break;

    case "solution":
      content.title = input.title;
      if (input.tagline) content.subtitle = input.tagline;
      break;

    case "feature":
      content.title = "Key Features";
      if (input.points.length > 0) {
        content.points = input.points.slice(0, 5);
      }
      break;

    case "cta":
      content.title = input.url;
      if (input.stats) content.stats = input.stats;
      if (input.summary) content.summary = input.summary;
      break;

    case "proof":
      if (input.title) content.title = input.title;
      if (input.stats) content.stats = input.stats;
      if (input.tagline) content.subtitle = input.tagline;
      break;

    case "showcase":
      // showcase 场景内容由 allocate 动态填充
      break;
  }

  return content;
}
