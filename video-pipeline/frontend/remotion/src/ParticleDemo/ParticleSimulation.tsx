import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { EffectPresets, PARTICLE_COUNT, ParticleEffectId } from './config';

// --------------------------------------------------------
// WebGL Shader: Stateless Particle Simulation
// --------------------------------------------------------

const vertexShader = `
uniform float uTime;
uniform float uNoiseFreq;
uniform float uCurlStrength;
uniform float uPointSize;

attribute vec3 randomData;

varying vec3 vColorRatio;
varying float vLife;

// --------------------------------------------------
// Simplex 3D Noise and Curl Noise Functions
// --------------------------------------------------

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 1.0/7.0;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

vec3 curlNoise(vec3 p) {
    const float e = .1;
    vec3 dx = vec3(e   , 0.0 , 0.0);
    vec3 dy = vec3(0.0 , e   , 0.0);
    vec3 dz = vec3(0.0 , 0.0 , e  );

    vec3 p_x0 = vec3( snoise(p - dx), snoise(p - dx + 10.0), snoise(p - dx + 20.0) );
    vec3 p_x1 = vec3( snoise(p + dx), snoise(p + dx + 10.0), snoise(p + dx + 20.0) );
    vec3 p_y0 = vec3( snoise(p - dy), snoise(p - dy + 10.0), snoise(p - dy + 20.0) );
    vec3 p_y1 = vec3( snoise(p + dy), snoise(p + dy + 10.0), snoise(p + dy + 20.0) );
    vec3 p_z0 = vec3( snoise(p - dz), snoise(p - dz + 10.0), snoise(p - dz + 20.0) );
    vec3 p_z1 = vec3( snoise(p + dz), snoise(p + dz + 10.0), snoise(p + dz + 20.0) );

    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

    const float divisor = 1.0 / ( 2.0 * e );
    return normalize( vec3( x , y , z ) * divisor );
}

void main() {
  vec3 basePos = position;
  
  // --- 整体缓慢自转 ---
  float angle = uTime * 0.3;
  float c = cos(angle);
  float s = sin(angle);
  basePos.xz = mat2(c, -s, s, c) * basePos.xz;
  
  // --- 花束呼吸盛开效果 (Blooming) ---
  float distFromCenter = length(basePos.xz);
  float bloom = sin(uTime * 1.5 - distFromCenter * 2.0) * 0.15;
  if (basePos.y > -1.0) { // 仅对花朵部分应用盛开
     basePos.x += (basePos.x / (distFromCenter + 0.001)) * bloom;
     basePos.z += (basePos.z / (distFromCenter + 0.001)) * bloom;
     basePos.y += bloom * 0.5;
  }
  
  // --- 局部微风飘动 (基于 Curl Noise) ---
  vec3 noisePos = basePos * uNoiseFreq + vec3(uTime * 0.2);
  vec3 curlDir = curlNoise(noisePos);
  
  // 最终坐标 = 自转盛开的底座 + 柏林噪声流体偏移
  vec3 finalPos = basePos + curlDir * uCurlStrength * (0.5 + 0.5 * sin(uTime * 0.5 + randomData.x * 10.0));
  
  // 发光变化：基于粒子的寿命（时间周期）
  float life = fract(uTime * (0.2 + randomData.y * 0.5) + randomData.z);
  vLife = life;
  
  // 混合色彩
  vColorRatio = vec3(randomData.x, randomData.y, randomData.z);
  
  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_PointSize = uPointSize * (1.0 / -mvPosition.z) * (1.0 - life); // 靠近死亡变小
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec3 vColorRatio;
varying float vLife;

void main() {
  // 绘制圆形粒子
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  
  // 颜色渐变: 从 ColorA 到 ColorB
  vec3 color = mix(uColorA, uColorB, vColorRatio.x);
  
  // 添加发光和随寿命淡出
  float alpha = smoothstep(0.5, 0.0, dist) * (1.0 - vLife);
  
  // 增加高光核心
  vec3 finalColor = color + vec3(1.0) * smoothstep(0.2, 0.0, dist) * 0.5;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// --------------------------------------------------------
// React Component
// --------------------------------------------------------

export const ParticleSimulation: React.FC<{ effectId: ParticleEffectId }> = ({ effectId }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const config = EffectPresets[effectId];

  // 生成初始点云数据
  const { positions, randoms } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const rnd = new Float32Array(PARTICLE_COUNT * 3);

    if (effectId === 'violet_bouquet') {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // 花束形状生成 (黄金角分布 Phyllotaxis)
        const theta = i * 2.339818934;
        const r = 2.0 * Math.sqrt(i / PARTICLE_COUNT);
        
        // 5 个花瓣的分组起伏
        const petalOffset = 0.4 * Math.sin(5 * theta);
        const finalR = r + petalOffset * r;
        
        // 花的杯状曲面 (抛物线)
        let y = finalR * finalR * 0.5 - 1.2;
        
        if (i < PARTICLE_COUNT * 0.1) {
          // 底部 10% 做花茎 (Stem)
          const stemY = -3.0 + Math.random() * 1.8;
          const stemR = 0.05 + (stemY + 3.0) * 0.05; 
          const stemTheta = Math.random() * Math.PI * 2;
          pos[i * 3 + 0] = stemR * Math.cos(stemTheta);
          pos[i * 3 + 1] = stemY;
          pos[i * 3 + 2] = stemR * Math.sin(stemTheta);
          
          rnd[i * 3 + 0] = 0.9; // 映射深色
        } else {
          // 花冠部分
          pos[i * 3 + 0] = finalR * Math.cos(theta);
          pos[i * 3 + 1] = y;
          pos[i * 3 + 2] = finalR * Math.sin(theta);
          
          rnd[i * 3 + 0] = r / 2.0; // 颜色从花心到外沿产生渐变
        }
        
        // 增加花粉微小随机散落感
        pos[i * 3 + 0] += (Math.random() - 0.5) * 0.15;
        pos[i * 3 + 1] += (Math.random() - 0.5) * 0.15;
        pos[i * 3 + 2] += (Math.random() - 0.5) * 0.15;

        rnd[i * 3 + 1] = Math.random(); 
        rnd[i * 3 + 2] = Math.random();
      }
    } else {
      // 原有的均匀球状混沌流体逻辑
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const r = Math.pow(Math.random(), 1 / 3) * 2.0;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        pos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        rnd[i * 3 + 0] = Math.random();
        rnd[i * 3 + 1] = Math.random();
        rnd[i * 3 + 2] = Math.random();
      }
    }
    return { positions: pos, randoms: rnd };
  }, [effectId]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNoiseFreq: { value: config.noiseFrequency },
      uCurlStrength: { value: config.curlStrength },
      uColorA: { value: new THREE.Color(...config.colorA) },
      uColorB: { value: new THREE.Color(...config.colorB) },
      uPointSize: { value: config.size * 1000.0 },
    }),
    [config]
  );

  useFrame(() => {
    if (materialRef.current) {
      // 同步 Remotion 的确定性时间到 Shader
      materialRef.current.uniforms.uTime.value = t;
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-randomData"
          count={randoms.length / 3}
          array={randoms}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
