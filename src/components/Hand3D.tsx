import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Float, Center, Torus } from '@react-three/drei';
import * as THREE from 'three';

interface Particle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export function Hand3D() {
  const { scene } = useGLTF('/right.glb');
  const group = useRef<THREE.Group>(null!);
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  
  // Clone the scene for the wireframe grid overlay
  const wireframeScene = useMemo(() => scene.clone(), [scene]);

  // Keep references to materials for color cycling
  const materialsRef = useRef<{
    solid: THREE.MeshPhysicalMaterial[];
    wireframe: THREE.MeshBasicMaterial[];
  }>({ solid: [], wireframe: [] });

  // References to bones for pinching animation
  const bonesRef = useRef<{
    thumb: THREE.Bone[];
    index: THREE.Bone[];
    middle: THREE.Bone[];
    ring: THREE.Bone[];
    pinky: THREE.Bone[];
    tips: THREE.Bone[];
  }>({ thumb: [], index: [], middle: [], ring: [], pinky: [], tips: [] });

  const isClickedRef = useRef(false);
  const pinchFactorRef = useRef(0);

  // Particle System Refs
  const particlesRef = useRef<Particle[]>([]);
  const nextId = useRef(0);
  const pointsRef = useRef<THREE.Points>(null!);
  const MAX_PARTICLES = 120;
  
  const particlePositions = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const particleColors = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);

  // Soft glow circular particle texture
  const dotTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => {
    // Solid Mesh Setup
    materialsRef.current.solid = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#b026ff'),
          emissive: new THREE.Color('#110022'),
          roughness: 0.1,
          metalness: 0.8,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          transmission: 0.5,
          thickness: 1.5,
        });
        mesh.material = mat;
        materialsRef.current.solid.push(mat);
      }
    });

    // Wireframe Mesh Setup
    materialsRef.current.wireframe = [];
    wireframeScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color('#00f3ff'),
          wireframe: true,
          transparent: true,
          opacity: 0.2,
        });
        mesh.material = mat;
        materialsRef.current.wireframe.push(mat);
      }
    });

    // Rigging & Bone Extraction
    bonesRef.current = { thumb: [], index: [], middle: [], ring: [], pinky: [], tips: [] };
    scene.traverse((child) => {
      if (child.name && (child as THREE.Bone).isBone) {
        const bone = child as THREE.Bone;
        const name = bone.name.toLowerCase();
        
        if (name.includes('thumb')) bonesRef.current.thumb.push(bone);
        else if (name.includes('index')) bonesRef.current.index.push(bone);
        else if (name.includes('middle')) bonesRef.current.middle.push(bone);
        else if (name.includes('ring')) bonesRef.current.ring.push(bone);
        else if (name.includes('pinky') || name.includes('little')) bonesRef.current.pinky.push(bone);
        
        if (name.includes('tip')) {
          bonesRef.current.tips.push(bone);
        }
      }
    });
  }, [scene, wireframeScene]);

  // Click & Pinch Event Listeners
  useEffect(() => {
    const handlePointerDown = () => {
      isClickedRef.current = true;
      
      // Trigger dynamic spark burst from fingertips
      bonesRef.current.tips.forEach((bone) => {
        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos);
        
        for (let i = 0; i < 6; i++) {
          particlesRef.current.push({
            id: nextId.current++,
            position: worldPos.clone(),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 1.5,
              (Math.random() - 0.5) * 1.5 + 0.5,
              (Math.random() - 0.5) * 1.5
            ),
            color: new THREE.Color().setHSL(Math.random(), 1.0, 0.6),
            size: Math.random() * 0.15 + 0.05,
            life: 0,
            maxLife: 0.4 + Math.random() * 0.4,
          });
        }
      });
    };

    const handlePointerUp = () => {
      isClickedRef.current = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Color Cycling
    const hue = (t * 0.05) % 1;
    const colorSolid = new THREE.Color().setHSL(hue, 1.0, 0.55);
    const colorWire = new THREE.Color().setHSL((hue + 0.3) % 1, 1.0, 0.6);

    materialsRef.current.solid.forEach((mat) => {
      mat.color.copy(colorSolid);
      mat.emissive.copy(colorSolid).multiplyScalar(0.15);
    });
    materialsRef.current.wireframe.forEach((mat) => {
      mat.color.copy(colorWire);
    });

    // 2. Pinching Animation (Curling bones when clicked)
    const targetPinch = isClickedRef.current ? 1.0 : 0.0;
    pinchFactorRef.current = THREE.MathUtils.lerp(pinchFactorRef.current, targetPinch, 0.15);

    // Apply rotation curls on joint bones
    bonesRef.current.index.forEach((bone, idx) => {
      if (idx > 0) {
        bone.rotation.z = -0.6 * pinchFactorRef.current;
      }
    });

    bonesRef.current.thumb.forEach((bone, idx) => {
      if (idx > 0) {
        bone.rotation.z = 0.5 * pinchFactorRef.current;
        bone.rotation.y = -0.4 * pinchFactorRef.current;
      }
    });

    [bonesRef.current.middle, bonesRef.current.ring, bonesRef.current.pinky].forEach((finger) => {
      finger.forEach((bone, idx) => {
        if (idx > 0) {
          bone.rotation.z = -0.4 * pinchFactorRef.current;
        }
      });
    });

    // 3. Hand Positioning & Mouse Tracking
    if (group.current) {
      group.current.rotation.x = -Math.PI / 2 + (-state.pointer.y * Math.PI) / 8 + Math.sin(t / 2) * 0.08;
      group.current.rotation.y = Math.PI + (state.pointer.x * Math.PI) / 6;
      group.current.rotation.z = Math.cos(t / 3) * 0.04;
    }

    // 4. Portal Rings Animations
    if (ring1.current) {
      ring1.current.rotation.z = t * 0.25;
      ring1.current.scale.setScalar(1 + Math.sin(t * 2.5) * 0.04);
    }
    if (ring2.current) {
      ring2.current.rotation.z = -t * 0.4;
      ring2.current.scale.setScalar(1.2 + Math.cos(t * 1.5) * 0.03);
    }

    // 5. Continuous Fingertip Particle Trail
    if (Math.random() < 0.4) {
      bonesRef.current.tips.forEach((bone) => {
        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos);

        particlesRef.current.push({
          id: nextId.current++,
          position: worldPos,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            Math.random() * 0.5 + 0.3, // float upwards
            (Math.random() - 0.5) * 0.4
          ),
          color: colorSolid.clone(),
          size: Math.random() * 0.08 + 0.04,
          life: 0,
          maxLife: 0.8 + Math.random() * 0.6,
        });
      });
    }

    // Update Particle Positions in buffers
    particlesRef.current = particlesRef.current.filter((p) => {
      p.life += delta;
      p.position.addScaledVector(p.velocity, delta);
      return p.life < p.maxLife;
    });

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;

    particlesRef.current.forEach((p, idx) => {
      if (idx < MAX_PARTICLES) {
        positions[idx * 3] = p.position.x;
        positions[idx * 3 + 1] = p.position.y;
        positions[idx * 3 + 2] = p.position.z;

        const lifeRatio = p.life / p.maxLife;
        const opacity = 1 - lifeRatio;

        colors[idx * 3] = p.color.r * opacity;
        colors[idx * 3 + 1] = p.color.g * opacity;
        colors[idx * 3 + 2] = p.color.b * opacity;
      }
    });

    // Hide remaining particles offscreen
    for (let i = particlesRef.current.length; i < MAX_PARTICLES; i++) {
      positions[i * 3] = 9999;
      positions[i * 3 + 1] = 9999;
      positions[i * 3 + 2] = 9999;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={group} scale={20} position={[0, 0, 0]}>
        
        {/* Portal Aura Ring 1 (Inner Cyan) */}
        <Torus ref={ring1} args={[2.0, 0.03, 8, 80]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.5]}>
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.4} depthWrite={false} />
        </Torus>

        {/* Portal Aura Ring 2 (Outer Magenta) */}
        <Torus ref={ring2} args={[2.4, 0.02, 8, 80]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.6]}>
          <meshBasicMaterial color="#b026ff" transparent opacity={0.3} depthWrite={false} />
        </Torus>

        <Center>
          {/* Solid Glass Hand Mesh */}
          <primitive object={scene} />
          {/* Wireframe Grid Overlay Mesh */}
          <primitive object={wireframeScene} scale={1.01} />
        </Center>

        {/* Fingertip Particle System */}
        <points ref={pointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particlePositions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[particleColors, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.2}
            map={dotTexture}
            vertexColors
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>

      </group>
    </Float>
  );
}

useGLTF.preload('/right.glb');
