import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Float, Center, Torus, ContactShadows } from '@react-three/drei';
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

export function Hand3D({ isMobile }: { isMobile: boolean }) {
  const { scene } = useGLTF('/right.glb');
  const group = useRef<THREE.Group>(null!);
  // Voxel Grid refs & memoized positions (Interacts with fingertips)
  const voxelsRef = useRef<{
    mesh: THREE.Mesh;
    baselineY: number;
    x: number;
    z: number;
  }[]>([]);

  const voxelData = useMemo(() => {
    const list = [];
    const size = 0.55;
    const countX = 4; // 9x9 grid centered under the hand
    const countZ = 4;
    for (let x = -countX; x <= countX; x++) {
      for (let z = -countZ; z <= countZ; z++) {
        list.push({
          id: `${x}_${z}`,
          x: x * (size + 0.08),
          z: z * (size + 0.08),
          baselineY: -2.3 // Placed right above the floor grid
        });
      }
    }
    return list;
  }, []);
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  
  // Responsive layout from Three.js viewport
  const { viewport } = useThree();
  const handX = isMobile ? 0 : viewport.width * 0.26;
  const handY = isMobile ? -0.8 : -0.7; // Aligned perfectly with center-right desktop viewport

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
  const MAX_PARTICLES = 200;
  
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

    // 2. Bone Curling + Finger Spreading (Abduction for finger separation)
    const idleCurl = Math.sin(t * 1.5) * 0.08; 
    const targetPinch = isClickedRef.current ? 1.0 : 0.0;
    pinchFactorRef.current = THREE.MathUtils.lerp(pinchFactorRef.current, targetPinch, 0.15);
    
    const activePinch = pinchFactorRef.current;
    const activeIdle = (1 - pinchFactorRef.current) * idleCurl;

    // Apply curls + dynamic spreading offsets
    bonesRef.current.index.forEach((bone, idx) => {
      if (idx > 0) {
        bone.rotation.z = -0.6 * activePinch + activeIdle;
      } else {
        bone.rotation.y = -0.15; // spread index outward left
      }
    });

    bonesRef.current.thumb.forEach((bone, idx) => {
      if (idx > 0) {
        bone.rotation.z = 0.5 * activePinch;
        bone.rotation.y = -0.4 * activePinch;
      } else {
        bone.rotation.y = -0.35; // spread thumb out
      }
    });

    bonesRef.current.middle.forEach((bone, idx) => {
      if (idx > 0) {
        bone.rotation.z = -0.4 * activePinch + activeIdle;
      } else {
        bone.rotation.y = 0; // middle finger stays center
      }
    });

    bonesRef.current.ring.forEach((bone, idx) => {
      if (idx > 0) {
        bone.rotation.z = -0.4 * activePinch + activeIdle;
      } else {
        bone.rotation.y = 0.1; // spread ring outward right
      }
    });

    bonesRef.current.pinky.forEach((bone, idx) => {
      if (idx > 0) {
        bone.rotation.z = -0.4 * activePinch + activeIdle;
      } else {
        bone.rotation.y = 0.25; // spread pinky outward right
      }
    });

    // 3. Hand Positioning & Natural Wrist Sway (avoid ugly cut-off base rotation)
    if (group.current) {
      // Natural vertical alignment pointing upwards/facing user
      group.current.rotation.x = -Math.PI / 6 + (-state.pointer.y * Math.PI) / 10 + Math.cos(t * 0.15) * 0.05;
      group.current.rotation.y = Math.PI + Math.sin(t * 0.2) * 0.3 + (state.pointer.x * Math.PI) / 8;
      group.current.rotation.z = Math.cos(t * 0.25) * 0.03;
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

    // 5. Fingertip trails (random size & fall speed + floor ripple interaction)
    if (Math.random() < 0.6) {
      bonesRef.current.tips.forEach((bone) => {
        const isIndex = bone.name.toLowerCase().includes('index');
        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos);

        const spawnCount = isIndex ? 2 : 1;
        for (let i = 0; i < spawnCount; i++) {
          particlesRef.current.push({
            id: nextId.current++,
            position: worldPos.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 0.06,
              (Math.random() - 0.5) * 0.06,
              (Math.random() - 0.5) * 0.06
            )),
            // Randomize fall speed and scatter velocities
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 0.5,
              isIndex 
                ? -(Math.random() * 0.5 + 0.3) 
                : -(Math.random() * 0.4 + 0.1), // fall downwards towards floor
              (Math.random() - 0.5) * 0.5
            ),
            color: isIndex ? new THREE.Color('#00f3ff') : colorSolid.clone(),
            // Randomize particle sizes
            size: isIndex 
              ? Math.random() * 0.22 + 0.1 
              : Math.random() * 0.12 + 0.04,
            life: 0,
            maxLife: 2.0 + Math.random() * 1.0,
          });
        }
      });
    }

    // Update trail particles & floor ripple physics
    const newParticles: Particle[] = [];
    particlesRef.current = particlesRef.current.filter((p) => {
      p.life += delta;
      p.position.addScaledVector(p.velocity, delta);

      // Check collision with floor (y = -3.2)
      if (p.position.y <= -3.2 && p.velocity.y < 0) {
        // Spawn 8 radial ripple particles moving outward on the X-Z plane
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          newParticles.push({
            id: nextId.current++,
            position: new THREE.Vector3(p.position.x, -3.2, p.position.z),
            velocity: new THREE.Vector3(
              Math.cos(angle) * 0.8,
              0, // stay on the floor
              Math.sin(angle) * 0.8
            ),
            color: p.color.clone(),
            size: p.size * 0.5,
            life: 0,
            maxLife: 0.35 + Math.random() * 0.15,
          });
        }
        return false; // Kill the falling particle
      }

      return p.life < p.maxLife;
    });
    
    // Merge ripple particles back
    particlesRef.current.push(...newParticles);

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

    // 8. Voxel Grid Interaction (Calculate distance from each block to closest fingertip)
    const tipsWorldPos = bonesRef.current.tips.map((bone) => {
      const pos = new THREE.Vector3();
      bone.getWorldPosition(pos);
      return pos;
    });

    voxelsRef.current.forEach((voxel) => {
      if (!voxel || !voxel.mesh) return;

      let minDist = 9999;
      tipsWorldPos.forEach((tip) => {
        // Calculate 3D distance between fingertip and voxel center
        const voxelWorldPos = new THREE.Vector3(voxel.x + handX, voxel.baselineY, voxel.z);
        const dist = tip.distanceTo(voxelWorldPos);
        if (dist < minDist) {
          minDist = dist;
        }
      });

      // Depress block and increase emissive intensity based on proximity
      const maxTriggerDist = 2.2;
      const factor = Math.max(0, 1 - (minDist / maxTriggerDist));

      // Standard linear interpolation for smooth depression physics
      const targetY = voxel.baselineY - (factor * 0.45);
      voxel.mesh.position.y = THREE.MathUtils.lerp(voxel.mesh.position.y, targetY, 0.15);

      // Dynamically alter material properties
      const mat = voxel.mesh.material as THREE.MeshPhysicalMaterial;
      if (mat) {
        mat.emissiveIntensity = 0.15 + (factor * 2.5);
        // Color transition from deep cyan to neon magenta/purple on approach
        const baseColor = new THREE.Color('#00f3ff');
        const activeColor = new THREE.Color('#ff007f');
        mat.color.copy(baseColor).lerp(activeColor, factor);
        mat.emissive.copy(baseColor).lerp(activeColor, factor);
      }
    });

    // 7. Dynamic light updates
    if (lightRef.current && group.current) {
      const handPos = new THREE.Vector3();
      group.current.getWorldPosition(handPos);
      lightRef.current.position.copy(handPos);
      lightRef.current.position.z += 1.5; 
      lightRef.current.color.copy(colorSolid);
    }
  });

  return (
    <>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <group ref={group} scale={20} position={[handX, handY, 0]}>
          
          {/* Portal Aura Ring 1 (Inner Cyan) */}
          <Torus ref={ring1} args={[2.0, 0.03, 8, 80]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.5]}>
            <meshPhysicalMaterial 
              color="#00f3ff" 
              emissive="#00f3ff" 
              emissiveIntensity={2.5} 
              transparent 
              opacity={0.8} 
              transmission={0.9} 
              roughness={0.1}
              thickness={0.5}
            />
          </Torus>

          {/* Portal Aura Ring 2 (Outer Magenta) */}
          <Torus ref={ring2} args={[2.4, 0.02, 8, 80]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.6]}>
            <meshPhysicalMaterial 
              color="#b026ff" 
              emissive="#b026ff" 
              emissiveIntensity={2.0} 
              transparent 
              opacity={0.7} 
              transmission={0.9} 
              roughness={0.1}
              thickness={0.5}
            />
          </Torus>

          <Center>
            {/* Solid Glass Hand Mesh */}
            <primitive object={scene} />
            {/* Wireframe Grid Overlay Mesh */}
            <primitive object={wireframeScene} scale={1.01} />
          </Center>
        </group>
      </Float>

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
          size={0.25}
          map={dotTexture}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Joint Skeletal Point Cloud */}
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
          size={0.55} 
          map={dotTexture}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Voxel Grid (Interacts dynamically with fingers) */}
      {voxelData.map((data, idx) => (
        <group key={data.id} position={[data.x + handX, 0, data.z]}>
          <mesh
            ref={(el) => {
              if (el) {
                voxelsRef.current[idx] = {
                  mesh: el as THREE.Mesh,
                  baselineY: data.baselineY,
                  x: data.x,
                  z: data.z
                };
              }
            }}
            position={[0, data.baselineY, 0]}
          >
            <boxGeometry args={[0.55, 0.55, 0.55]} />
            <meshPhysicalMaterial
              color="#00f3ff"
              emissive="#00f3ff"
              emissiveIntensity={0.15}
              roughness={0.1}
              metalness={0.8}
              transparent
              opacity={0.85}
              transmission={0.4}
              thickness={0.5}
            />
            {/* Outline box segments to match voxel grid look in prompt image */}
            <lineSegments>
              <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(0.55, 0.55, 0.55)]} />
              <lineBasicMaterial attach="material" color="#00f3ff" linewidth={1.5} />
            </lineSegments>
          </mesh>
        </group>
      ))}

      {/* Soft ground contact shadow for anchoring */}
      <ContactShadows 
        position={[0, -3.18, 0]} 
        opacity={0.7} 
        scale={30} 
        blur={2.0} 
        far={4.5} 
        color="#000000" 
      />

      {/* Hand Dynamic Light */}
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
