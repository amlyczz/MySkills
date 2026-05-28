import { useFrame, useThree } from '@react-three/fiber';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { MotionId } from './config';
import * as THREE from 'three';

export const CameraRig: React.FC<{ motionId: MotionId }> = ({ motionId }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const { camera } = useThree();

  useFrame(() => {
    // 摄像机运镜逻辑
    if (motionId === 'orbit') {
      const radius = 2.5;
      const speed = 0.5;
      camera.position.x = Math.sin(t * speed) * radius;
      camera.position.z = Math.cos(t * speed) * radius;
      camera.position.y = 1.0;
    } else if (motionId === 'spiral') {
      const radius = 2.0;
      const speed = 0.8;
      camera.position.x = Math.sin(t * speed) * radius;
      camera.position.z = Math.cos(t * speed) * radius;
      camera.position.y = t * 0.5 - 1.0;
    }

    camera.lookAt(new THREE.Vector3(0, 0, 0));
  });

  return null;
};
