import { z } from "zod";

// ── Primitives ──
const easingSchema = z.union([
  z.object({
    type: z.enum(["spring"]),
    params: z.object({ mass: z.number().optional(), damping: z.number().optional(), stiffness: z.number().optional() }).optional(),
  }),
  z.object({
    type: z.enum(["bezier"]),
    bezier: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  }),
  z.object({ type: z.enum(["linear"]) }),
  z.string(), // Motion token name
]);

const loopSchema = z.object({
  type: z.enum(["pulse", "float", "spin", "wiggle"]),
  durationInFrames: z.number().int().positive(),
  amplitude: z.number().optional(),
});

const animationSchema = z.object({
  type: z.enum([
    "none", "fade-in", "fade-out", "fade-up", "fade-down",
    "scale-in", "scale-bounce",
    "slide-left", "slide-right", "slide-up", "slide-down",
    "bar-grow", "typewriter",
  ]),
  timeline: z.object({
    inFrame: z.number().int(),
    outFrame: z.number().int().optional(),
    duration: z.number().int().optional(),
  }),
  startState: z.record(z.string(), z.number()).optional(),
  endState: z.record(z.string(), z.number()).optional(),
  easing: easingSchema.optional(),
  stagger: z.object({
    delayPerChild: z.number().int().positive(),
    direction: z.enum(["forward", "reverse"]).optional(),
  }).optional(),
  loop: loopSchema.optional(),
});

const layoutSchema = z.object({
  position: z.enum(["absolute", "relative", "flex-child"]).optional(),
  x: z.union([z.number(), z.string()]).optional(),
  y: z.union([z.number(), z.string()]).optional(),
  width: z.union([z.number(), z.string()]).optional(),
  height: z.union([z.number(), z.string()]).optional(),
  zIndex: z.number().optional(),
  scale: z.number().optional(),
  rotation: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
}).optional();

const elementSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.string(), z.unknown()).optional(),
    layout: layoutSchema,
    animation: animationSchema.optional(),
    style: z.record(z.string(), z.unknown()).optional(),
    condition: z.string().optional(),
    children: z.array(elementSchema).optional(),
  })
);

const voiceoverSchema = z.object({
  audioUrl: z.string(),
  text: z.string(),
  startFrame: z.number().int(),
  endFrame: z.number().int().optional(),
  volume: z.number().min(0).max(1).optional(),
  loop: z.boolean().optional(),
});

const subtitleTokenSchema = z.object({
  text: z.string(),
  fromFrame: z.number().int(),
  toFrame: z.number().int(),
});

const subtitleSchema = z.object({
  tokens: z.array(subtitleTokenSchema).optional(),
  srtUrl: z.string().optional(),
  captionsUrl: z.string().optional(),
  highlightColor: z.string().optional(),
  fontSize: z.number().optional(),
});

const sfxTriggerSchema = z.object({
  sfx: z.string(),
  atFrame: z.number().int(),
  frameOf: z.enum(["scene", "global"]).optional(),
  volume: z.number().min(0).max(1).optional(),
});

const sceneSchema = z.object({
  id: z.string(),
  type: z.string(),
  startFrame: z.number().int(),
  durationInFrames: z.number().int().positive(),
  description: z.string().optional(),
  background: z.object({
    type: z.string(),
    props: z.record(z.string(), z.unknown()).optional(),
  }).nullable().optional(),
  style: z.record(z.string(), z.unknown()).optional(),
  transitionToNext: z.object({
    type: z.string(),
    durationInFrames: z.number().int(),
    props: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  elements: z.array(elementSchema).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  voiceover: voiceoverSchema.optional(),
  subtitles: subtitleSchema.optional(),
  sfx: z.array(sfxTriggerSchema).optional(),
});

export const blueprintSchema = z.object({
  meta: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
  }),
  data: z.record(z.string(), z.unknown()).optional(),
  variables: z.object({
    content: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["string", "number", "image", "textarea"]),
      default: z.unknown(),
    })),
    theme: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["color", "font"]),
      default: z.unknown(),
    })),
  }).optional(),
  globalSettings: z.object({
    safeArea: z.object({
      top: z.number(),
      right: z.number(),
      bottom: z.number(),
      left: z.number(),
      unit: z.enum(["px", "%"]),
    }).optional(),
    theme: z.object({
      colors: z.record(z.string(), z.string()),
      typography: z.object({
        primaryFont: z.string(),
        fallbackFont: z.string().optional(),
        scales: z.record(z.string(), z.string()),
      }),
      shape: z.object({
        radii: z.record(z.string(), z.string()).optional(),
        shadows: z.record(z.string(), z.string()).optional(),
      }).optional(),
    }),
    motionTokens: z.record(z.string(), z.object({
      easing: z.union([
        z.object({ type: z.literal("spring"), params: z.object({ mass: z.number(), damping: z.number(), stiffness: z.number() }) }),
        z.object({ type: z.literal("bezier"), bezier: z.tuple([z.number(), z.number(), z.number(), z.number()]) }),
        z.object({ type: z.literal("linear") }),
      ]),
      duration: z.number().int().optional(),
    })).optional(),
    audio: z.object({
      bgmUrl: z.string().optional(),
      bgmVolume: z.number().min(0).max(1).optional(),
      sfx: z.record(z.string(), z.string()).optional(),
      ducking: z.object({
        enabled: z.boolean(),
        duckToVolume: z.number().min(0).max(1).optional(),
        fadeDurationFrames: z.number().int().optional(),
      }).optional(),
    }).optional(),
  }),
  globalBackground: z.object({
    type: z.string(),
    props: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  globalOverlays: z.array(elementSchema).optional(),
  scenes: z.array(sceneSchema),
});

export type BlueprintSchema = z.infer<typeof blueprintSchema>;

/** Validate a blueprint and return structured errors if invalid */
export function validateBlueprint(data: unknown): {
  success: boolean;
  errors?: string[];
  blueprint?: BlueprintSchema;
} {
  const result = blueprintSchema.safeParse(data);
  if (result.success) {
    return { success: true, blueprint: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `[${path}] ${issue.message}`;
    }),
  };
}
