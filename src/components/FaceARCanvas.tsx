import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, MeshTransmissionMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { FaceState } from '../hooks/useFaceTracking';

// Simple Cyberpunk Visor
const CyberpunkVisor = ({ faceStateRef }: { faceStateRef: React.MutableRefObject<FaceState> }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  useFrame(() => {
    if (!faceStateRef.current.landmarks || !meshRef.current || !glowRef.current) {
      if (meshRef.current) meshRef.current.visible = false;
      if (glowRef.current) glowRef.current.visible = false;
      return;
    }
    
    meshRef.current.visible = true;
    glowRef.current.visible = true;

    // Use nose bridge (point 168) and ears (137, 366) to position visor
    const lm = faceStateRef.current.landmarks;
    const nose = lm[168]; // between eyes
    const leftEar = lm[137]; // approximate left side
    const rightEar = lm[366]; // approximate right side

    // Position visor exactly at eye level
    meshRef.current.position.set(nose.x * (viewport.width / 2), nose.y * (viewport.height / 2), 1.5);
    glowRef.current.position.copy(meshRef.current.position);

    // Calculate rotation (yaw and roll)
    const dx = rightEar.x - leftEar.x;
    const dy = rightEar.y - leftEar.y;
    const angle = Math.atan2(dy, dx);
    meshRef.current.rotation.z = angle;
    glowRef.current.rotation.z = angle;
    
    // Calculate pitch (approximated by distance between nose and chin vs forehead)
    // For a simple visor, we just set a fixed offset
    
    // Scale based on face width
    const faceWidth = Math.sqrt(dx * dx + dy * dy);
    const scale = faceWidth * (viewport.width / 2) * 1.5; // Scale visor relative to face
    meshRef.current.scale.set(scale, scale * 0.3, scale);
    glowRef.current.scale.copy(meshRef.current.scale).multiplyScalar(1.05);
  });

  return (
    <>
      {/* Outer Glow */}
      <mesh ref={glowRef}>
        <boxGeometry args={[1, 1, 0.2]} />
        <meshBasicMaterial color="#00f3ff" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Glass Visor */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 0.2]} />
        <MeshTransmissionMaterial 
          backside 
          samples={4} 
          thickness={0.5} 
          chromaticAberration={1} 
          anisotropy={0.3} 
          distortion={0.5} 
          distortionScale={0.5} 
          temporalDistortion={0.1} 
          color="#ff007f"
        />
      </mesh>
    </>
  );
};

// Holographic HUD
const HolographicHUD = ({ faceStateRef }: { faceStateRef: React.MutableRefObject<FaceState> }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  useFrame((_state, delta) => {
    if (!faceStateRef.current.landmarks || !groupRef.current) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    // Anchor HUD around the whole head (nose point 1 as center)
    const nose = faceStateRef.current.landmarks[1];
    groupRef.current.position.set(nose.x * (viewport.width / 2), nose.y * (viewport.height / 2), 0);

    // Rotate rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 0.5;
      ring1Ref.current.rotation.y += delta * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x -= delta * 0.3;
      ring2Ref.current.rotation.z += delta * 0.6;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2, 0.02, 16, 100]} />
        <meshBasicMaterial color="#39ff14" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring2Ref} scale={[1.2, 1.2, 1.2]}>
        <torusGeometry args={[2, 0.01, 16, 100]} />
        <meshBasicMaterial color="#00f3ff" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>
      <Sparkles count={50} scale={5} size={2} speed={0.4} opacity={0.8} color="#b026ff" />
    </group>
  );
};

// Anime / Comic Stylized Geometry
const AnimeStylized = ({ faceStateRef }: { faceStateRef: React.MutableRefObject<FaceState> }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  // Create a mesh out of the landmarks (very simplified representation using spheres for key points)
  // To keep it high-fps, we just draw glowing blush and stylized eyebrows
  const blushLeftRef = useRef<THREE.Mesh>(null);
  const blushRightRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!faceStateRef.current.landmarks || !groupRef.current) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const lm = faceStateRef.current.landmarks;
    
    // Position blush on cheeks (approx points 205 and 425)
    if (blushLeftRef.current && lm[205]) {
      blushLeftRef.current.position.set(lm[205].x * (viewport.width / 2), lm[205].y * (viewport.height / 2), 1.0);
    }
    if (blushRightRef.current && lm[425]) {
      blushRightRef.current.position.set(lm[425].x * (viewport.width / 2), lm[425].y * (viewport.height / 2), 1.0);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Anime Blush Marks */}
      <mesh ref={blushLeftRef}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshBasicMaterial color="#ff007f" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={blushRightRef}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshBasicMaterial color="#ff007f" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

export const FaceARCanvas = ({ faceStateRef, activeMaskIndex }: { faceStateRef: React.MutableRefObject<FaceState>, activeMaskIndex: number }) => {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={2} />
        <Environment preset="city" />
        
        {activeMaskIndex === 0 && <CyberpunkVisor faceStateRef={faceStateRef} />}
        {activeMaskIndex === 1 && <HolographicHUD faceStateRef={faceStateRef} />}
        {activeMaskIndex === 2 && <AnimeStylized faceStateRef={faceStateRef} />}
        
      </Canvas>
    </div>
  );
};
