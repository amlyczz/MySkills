/**
 * structures.ts — 结构模板定义。
 *
 * 结构模板 = 场景序列配置。定义视频由哪些场景组成、每个场景的时长和内容槽位。
 * 作用域：整个视频（视频级）。
 */
import { StructureTemplate } from "./types";

/**
 * 漏斗型叙事 — 首个实现的结构模板。
 *
 * hook → problem → solution → showcase(动态) → feature → cta
 */
export const funnelStructure: StructureTemplate = {
  id: "funnel",
  name: "漏斗型叙事",
  scenes: [
    {
      id: "hook",
      type: "hook",
      durationSeconds: 5,
      contentSlots: [
        { name: "headline", type: "text", required: true, maxLines: 2 },
        { name: "visual", type: "media", required: false },
      ],
    },
    {
      id: "problem",
      type: "problem",
      durationSeconds: 6,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
        { name: "points", type: "text", required: true, maxLines: 4 },
      ],
    },
    {
      id: "solution",
      type: "solution",
      durationSeconds: 6,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
        { name: "subtitle", type: "text", required: false, maxLines: 2 },
        { name: "visual", type: "media", required: false },
      ],
    },
    {
      id: "showcase",
      type: "showcase",
      durationSeconds: 0, // 动态：由 allocate 根据素材量决定
      requiredAssets: ["video", "image", "scroll_recording"],
      contentSlots: [],
    },
    {
      id: "features",
      type: "feature",
      durationSeconds: 8,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
        { name: "points", type: "text", required: true, maxLines: 5 },
      ],
    },
    {
      id: "cta",
      type: "cta",
      durationSeconds: 6,
      contentSlots: [
        { name: "url", type: "text", required: true },
        { name: "stats", type: "text", required: false },
        { name: "summary", type: "text", required: false, maxLines: 3 },
      ],
    },
  ],
};

/**
 * 时间线型叙事 — 按时间线讲述项目发展故事。
 *
 * hook → origin(problem) → milestones(feature) → showcase(动态) → today(proof) → cta
 */
export const timelineStructure: StructureTemplate = {
  id: "timeline",
  name: "时间线型叙事",
  scenes: [
    {
      id: "hook",
      type: "hook",
      durationSeconds: 4,
      contentSlots: [
        { name: "headline", type: "text", required: true, maxLines: 2 },
      ],
    },
    {
      id: "origin",
      type: "problem",
      durationSeconds: 6,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
        { name: "subtitle", type: "text", required: false, maxLines: 3 },
      ],
    },
    {
      id: "milestones",
      type: "feature",
      durationSeconds: 8,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
        { name: "points", type: "text", required: true, maxLines: 6 },
      ],
    },
    {
      id: "showcase",
      type: "showcase",
      durationSeconds: 0, // 动态
      requiredAssets: ["video", "image"],
      contentSlots: [],
    },
    {
      id: "today",
      type: "proof",
      durationSeconds: 6,
      contentSlots: [
        { name: "title", type: "text", required: false, maxLines: 1 },
        { name: "stats", type: "text", required: true },
        { name: "subtitle", type: "text", required: false, maxLines: 2 },
      ],
    },
    {
      id: "cta",
      type: "cta",
      durationSeconds: 6,
      contentSlots: [
        { name: "url", type: "text", required: true },
        { name: "summary", type: "text", required: false, maxLines: 3 },
      ],
    },
  ],
};

/**
 * 产品展示型 — 适合有丰富媒体素材的项目。
 *
 * hook → problem → showcase(动态) → features → proof → cta
 */
export const productShowcaseStructure: StructureTemplate = {
  id: "product-showcase",
  name: "产品展示型",
  scenes: [
    {
      id: "hook",
      type: "hook",
      durationSeconds: 4,
      contentSlots: [
        { name: "headline", type: "text", required: true, maxLines: 2 },
      ],
    },
    {
      id: "problem",
      type: "problem",
      durationSeconds: 5,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
        { name: "points", type: "text", required: true, maxLines: 3 },
      ],
    },
    {
      id: "demo",
      type: "showcase",
      durationSeconds: 0, // 动态
      requiredAssets: ["video", "image", "scroll_recording"],
      contentSlots: [],
    },
    {
      id: "features",
      type: "feature",
      durationSeconds: 8,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
        { name: "points", type: "text", required: true, maxLines: 5 },
      ],
    },
    {
      id: "proof",
      type: "proof",
      durationSeconds: 5,
      contentSlots: [
        { name: "title", type: "text", required: false, maxLines: 1 },
        { name: "stats", type: "text", required: false },
        { name: "subtitle", type: "text", required: false, maxLines: 3 },
      ],
    },
    {
      id: "cta",
      type: "cta",
      durationSeconds: 6,
      contentSlots: [
        { name: "url", type: "text", required: true },
        { name: "summary", type: "text", required: false, maxLines: 3 },
      ],
    },
  ],
};

/**
 * 性能发布型叙事 — 对标 Cohere 发布视频的 宣告→证明→特性→愿景。
 *
 * hook(logo) → proof(数据×2) → features → cta
 */
export const performanceLaunchStructure: StructureTemplate = {
  id: "performance-launch",
  name: "性能发布型",
  scenes: [
    {
      id: "hook",
      type: "hook",
      durationSeconds: 4,
      contentSlots: [
        { name: "headline", type: "text", required: true, maxLines: 2 },
        { name: "subtitle", type: "text", required: false, maxLines: 1 },
      ],
    },
    {
      id: "proof-1",
      type: "proof",
      durationSeconds: 7,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
      ],
    },
    {
      id: "proof-2",
      type: "proof",
      durationSeconds: 7,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
      ],
    },
    {
      id: "showcase",
      type: "showcase",
      durationSeconds: 145,  // dynamic, overridden by sceneConfig in allocate.py
      requiredAssets: ["video", "image"],
      contentSlots: [],
    },
    {
      id: "features",
      type: "feature",
      durationSeconds: 10,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
        { name: "points", type: "text", required: true, maxLines: 5 },
      ],
    },
    {
      id: "cta",
      type: "cta",
      durationSeconds: 6,
      contentSlots: [
        { name: "title", type: "text", required: true, maxLines: 1 },
        { name: "url", type: "text", required: false },
        { name: "summary", type: "text", required: false, maxLines: 2 },
      ],
    },
  ],
};

/** 所有预置结构模板 */
export const structureTemplates: StructureTemplate[] = [
  funnelStructure,
  timelineStructure,
  productShowcaseStructure,
  performanceLaunchStructure,
];

/** 按 ID 查找结构模板 */
export function getStructure(id: string): StructureTemplate | undefined {
  return structureTemplates.find((s) => s.id === id);
}
