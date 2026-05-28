export type ParticleEffectId = 'galaxy_dust' | 'liquid_gold' | 'violet_bouquet';
export type MotionId = 'orbit' | 'spiral';

export interface ParticleEffectConfig {
  noiseFrequency: number;
  curlStrength: number;
  colorA: [number, number, number]; // RGB 0-1
  colorB: [number, number, number]; // RGB 0-1
  size: number;
}

export const EffectPresets: Record<ParticleEffectId, ParticleEffectConfig> = {
  galaxy_dust: {
    noiseFrequency: 1.5,
    curlStrength: 2.0,
    colorA: [1.0, 0.2, 0.4], // 亮粉色
    colorB: [0.2, 0.4, 1.0], // 亮蓝色
    size: 0.05,
  },
  liquid_gold: {
    noiseFrequency: 0.5,
    curlStrength: 0.8,
    colorA: [1.0, 0.8, 0.0], // 金色
    colorB: [1.0, 0.5, 0.0], // 橙色
    size: 0.06,
  },
  violet_bouquet: {
    noiseFrequency: 0.2,
    curlStrength: 0.1,
    colorA: [0.6, 0.1, 0.9], // 深紫罗兰色
    colorB: [0.9, 0.6, 1.0], // 亮粉紫
    size: 0.035,
  },
};

export const PARTICLE_COUNT = 256 * 256; // 65536 particles for performance
