import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
  const lightRef = useRef<THREE.PointLight>(null!);
  
  // Responsive layout from Three.js viewport
  const { viewport } = useThree();
  const isMobile = viewport.width < 10;
  const handX = isMobile ? 0 : viewport.width * 0.18;
  const handY = isMobile ? -1.0 : -0.5;

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

  // Particle System Refs (Fingertip Trails)
  const particlesRef = useRef<Particle[]>([]);
  const nextId = useRef(0);
  const pointsRef = useRef<THREE.Points>(null!);
  const MAX_PARTICLES = 150;
  
  const particlePositions = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const particleColors = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);

  // Joint Points Refs (Stretch Goal - Point-cloud skeletal display)
  const jointPointsRef = useRef<THREE.Points>(null!);
  const MAX_JOINTS = 30;
  const jointPositions = useMemo(() => new Float32Array(MAX_JOINTS * 3), []);
  const jointColors = useMemo(() => new Float32Array(MAX_JOINTS * 3), []);

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
    // Solid Mesh Setup: Emissive holographic glass
    materialsRef.current.solid = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#b026ff'),
          emissive: new THREE.Color('#b026ff'),
          emissiveIntensity: 1.2,
          roughness: 0.15,
          metalness: 0.1,
          transparent: true,
          opacity: 0.35,
          transmission: 0.9,
          thickness: 1.2,
        });
        mesh.material = mat;
        materialsRef.current.solid.push(mat);
      }
    });

    // Wireframe Mesh Setup: Glowing cyber-mesh
    materialsRef.current.wireframe = [];
    wireframeScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color('#00f3ff'),
          wireframe: true,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending
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

  // Click & Pinch Event Listeners (Burst particles from fingertips)
  useEffect(() => {
    const handlePointerDown = () => {
      isClickedRef.current = true;
      
      bonesRef.current.tips.forEach((bone) => {
        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos);
        
        for (let i = 0; i < 8; i++) {
          particlesRef.current.push({
            id: nextId.current++,
            position: worldPos.clone(),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 2.0,
              (Math.random() - 0.5) * 2.0 + 0.5,
              (Math.random() - 0.5) * 2.0
            ),
            color: new THREE.Color().setHSL(0.5 + Math.random() * 0.38, 1.0, 0.6), // Cyan-Pink
            size: Math.random() * 0.2 + 0.08,
            life: 0,
            maxLife: 0.5 + Math.random() * 0.5,
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

    // 1. Clamped Color Cycling (strictly cyan -> purple -> pink/magenta)
    const hueSolid = 0.5 + 0.19 * (Math.sin(t * 0.15) + 1); // 0.5 to 0.88 HSL
    const hueWire = 0.5 + 0.19 * (Math.sin(t * 0.15 + 1.0) + 1); // Phase offset
    const colorSolid = new THREE.Color().setHSL(hueSolid, 1.0, 0.55);
    const colorWire = new THREE.Color().setHSL(hueWire, 1.0, 0.6);

    materialsRef.current.solid.forEach((mat) => {
      mat.color.copy(colorSolid);
      mat.emissive.copy(colorSolid);
    });
    materialsRef.current.wireframe.forEach((mat) => {
      mat.color.copy(colorWire);
    });

    // 2. Bone Curling (Pinching / Clicking + subtle idle curling)
    const idleCurl = Math.sin(t * 1.5) * 0.08; // Gentle finger breathing
    const targetPinch = isClickedRef.current ? 1.0 : 0.0;
    pinchFactorRef.current = THREE.MathUtils.lerp(pinchFactorRef.current, targetPinch, 0.15);
    
    const activePinch = pinchFactorRef.current;
    const activeIdle = (1 - pinchFactorRef.current) * idleCurl;

    // Apply curls
    bonesRef.current.index.forEach((bone, idx) => {
      if (idx > 0) bone.rotation.z = -0.6 * activePinch + activeIdle;
    });

    bonesRef.current.thumb.forEach((bone, idx) => {
      if (idx > 0) {
        bone.rotation.z = 0.5 * activePinch;
        bone.rotation.y = -0.4 * activePinch;
      }
    });

    [bonesRef.current.middle, bonesRef.current.ring, bonesRef.current.pinky].forEach((finger) => {
      finger.forEach((bone, idx) => {
        if (idx > 0) bone.rotation.z = -0.4 * activePinch + activeIdle;
      });
    });

    // 3. Hand Positioning & Continuous Rotations
    if (group.current) {
      // Rotate fully every 25 seconds + hover reaction + mouse tracking
      const slowRotate = t * (Math.PI * 2) / 25;
      group.current.rotation.x = -Math.PI / 2 + (-state.pointer.y * Math.PI) / 10 + Math.sin(t / 2) * 0.05;
      group.current.rotation.y = Math.PI + slowRotate + (state.pointer.x * Math.PI) / 8;
      group.current.rotation.z = Math.cos(t / 3) * 0.03;
    }

    // 4. Portal Rings Animations
    if (ring1.current) {
      ring1.current.rotation.z = t * 0.2;
      ring1.current.scale.setScalar(1 + Math.sin(t * 2.0) * 0.03);
    }
    if (ring2.current) {
      ring2.current.rotation.z = -t * 0.35;
      ring2.current.scale.setScalar(1.25 + Math.cos(t * 1.2) * 0.02);
    }

    // 5. fingertip trails (rendered in world space)
    if (Math.random() < 0.5) {
      bonesRef.current.tips.forEach((bone) => {
        const isIndex = bone.name.toLowerCase().includes('index');
        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos);

        const spawnCount = isIndex ? 2 : 1;
        for (let i = 0; i < spawnCount; i++) {
          particlesRef.current.push({
            id: nextId.current++,
            position: worldPos.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 0.04,
              (Math.random() - 0.5) * 0.04,
              (Math.random() - 0.5) * 0.04
            )),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 0.3,
              isIndex ? -(Math.random() * 0.4 + 0.2) : Math.random() * 0.3 + 0.1, // index draws back/down, others drift up
              (Math.random() - 0.5) * 0.3
            ),
            color: isIndex ? new THREE.Color('#00f3ff') : colorSolid.clone(),
            size: isIndex ? Math.random() * 0.18 + 0.08 : Math.random() * 0.08 + 0.04,
            life: 0,
            maxLife: isIndex ? 1.4 + Math.random() * 0.8 : 0.7 + Math.random() * 0.5,
          });
        }
      });
    }

    // Update trail particles
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

        const opacity = 1 - (p.life / p.maxLife);
        colors[idx * 3] = p.color.r * opacity;
        colors[idx * 3 + 1] = p.color.g * opacity;
        colors[idx * 3 + 2] = p.color.b * opacity;
      }
    });

    for (let i = particlesRef.current.length; i < MAX_PARTICLES; i++) {
      positions[i * 3] = 9999;
      positions[i * 3 + 1] = 9999;
      positions[i * 3 + 2] = 9999;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;

    // 6. Joint Skeletal Point Cloud (Stretch Goal)
    if (jointPointsRef.current) {
      const jPos = jointPointsRef.current.geometry.attributes.position.array as Float32Array;
      const jCol = jointPointsRef.current.geometry.attributes.color.array as Float32Array;
      
      let count = 0;
      const allBones = [
        ...bonesRef.current.thumb,
        ...bonesRef.current.index,
        ...bonesRef.current.middle,
        ...bonesRef.current.ring,
        ...bonesRef.current.pinky
      ];
      
      allBones.forEach((bone) => {
        if (count < MAX_JOINTS) {
          const worldPos = new THREE.Vector3();
          bone.getWorldPosition(worldPos);
          
          jPos[count * 3] = worldPos.x;
          jPos[count * 3 + 1] = worldPos.y;
          jPos[count * 3 + 2] = worldPos.z;
          
          // Color corresponding to solid hand color
          jCol[count * 3] = colorWire.r;
          jCol[count * 3 + 1] = colorWire.g;
          jCol[count * 3 + 2] = colorWire.b;
          
          count++;
        }
      });

      for (let i = count; i < MAX_JOINTS; i++) {
        jPos[i * 3] = 9999;
        jPos[i * 3 + 1] = 9999;
        jPos[i * 3 + 2] = 9999;
      }
      jointPointsRef.current.geometry.attributes.position.needsUpdate = true;
      jointPointsRef.current.geometry.attributes.color.needsUpdate = true;
    }

    // 7. Dynamic light updates
    if (lightRef.current && group.current) {
      const handPos = new THREE.Vector3();
      group.current.getWorldPosition(handPos);
      lightRef.current.position.copy(handPos);
      lightRef.current.position.z += 1.5; // position slightly in front of the hand
      lightRef.current.color.copy(colorSolid);
    }
  });

  return (
    <>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <group ref={group} scale={20} position={[handX, handY, 0]}>
          
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
        </group>
      </Float>

      {/* Fingertip Particle System (rendered in world space) */}
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
          size={0.25}
          map={dotTexture}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Joint Skeletal Point Cloud (rendered in world space) */}
      <points ref={jointPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[jointPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[jointColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.55} // Large bright glowing joint nodes
          map={dotTexture}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Hand Dynamic Light (illuminates environment with matching color) */}
      <pointLight
        ref={lightRef}
        intensity={6}
        distance={15}
        decay={1.5}
      />
    </>
  );
}

useGLTF.preload('/right.glb');
