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

const defaultLayoutBySceneType: Record<string, LayoutType> = {
  hook: "hero-center",
  problem: "hero-center",
  solution: "split-left-text",
  feature: "card-grid",
  proof: "stat-highlight",
  cta: "hero-center",
  showcase: "media-full",
  transition: "hero-center",
};

export function matchLayout(sceneType: string): LayoutType {
  return defaultLayoutBySceneType[sceneType] ?? "hero-center";
}

// ── 4. 动效匹配 ──

export function matchMotion(elementRole: string): MotionType {
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
  for (const scene of structure.scenes) {
    const layoutId = matchLayout(scene.type);

    // 为场景中的每个内容槽位分配动效
    const motionMap: Record<string, MotionType> = {};
    for (const slot of scene.contentSlots) {
      motionMap[slot.name] = matchMotion(slot.name);
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
