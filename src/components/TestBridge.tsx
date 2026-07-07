import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export function TestBridge() {
  const { scene, gl, camera } = useThree();
  useEffect(() => {
    if (window.location.search.includes('test=true')) {
      (window as any).__THREE_SCENE__ = scene;
      (window as any).__THREE_GL__ = gl;
      (window as any).__THREE_CAMERA__ = camera;
    }
  }, [scene, gl, camera]);
  return null;
}
