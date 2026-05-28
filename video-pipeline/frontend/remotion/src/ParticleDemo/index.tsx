import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ParticleEffectId, MotionId } from './config';
import { CameraRig } from './CameraRig';
import { ParticleSimulation } from './ParticleSimulation';

export interface ParticleDemoProps {
  effectId: ParticleEffectId;
  motionId: MotionId;
}

export const ParticleDemo: React.FC<ParticleDemoProps> = ({ effectId, motionId }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas
        linear
        width={1920}
        height={1080}
        camera={{ position: [0, 0, 5], fov: 75 }}
      >
        <CameraRig motionId={motionId} />
        
        <ParticleSimulation effectId={effectId} />
        
        <EffectComposer disableNormalPass>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={1.5}
            mipmapBlur
          />
        </EffectComposer>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
