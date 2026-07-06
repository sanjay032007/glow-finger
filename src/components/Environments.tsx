import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid, MeshReflectorMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export type EnvMode = 'NEON' | 'SYNTHWAVE' | 'CYBERPUNK';

interface Props {
  mode: EnvMode;
  combo: number;
}

// 1. Background Gradient Plane
function BackgroundGradient() {
  return (
    <mesh position={[0, 0, -35]}>
      <planeGeometry args={[120, 80]} />
      <shaderMaterial
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          void main() {
            // Gradient from dark purple/navy at bottom to near-black at top
            vec3 colorBottom = vec3(0.04, 0.015, 0.08); // dark purple/navy
            vec3 colorTop = vec3(0.005, 0.005, 0.01);    // near-black
            vec3 finalColor = mix(colorBottom, colorTop, vUv.y);
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
        depthWrite={false}
      />
    </mesh>
  );
}

// 2. Depth-based Parallax Starfield/Particle system
function DepthParticles({ count = 250, intensity = 1.0 }) {
  // Use intensity to scale particle speed slightly
  const speedMultiplier = intensity;
  const points = useRef<THREE.Points>(null!);
  
  const [positions, colors, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    
    const palette = [
      new THREE.Color('#00f3ff'), // Cyan
      new THREE.Color('#b026ff'), // Violet
      new THREE.Color('#ff007f'), // Pink/Magenta
    ];

    for (let i = 0; i < count; i++) {
      // Position particles in a large box around the scene
      pos[i * 3] = (Math.random() - 0.5) * 45;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      // Z coordinates spread out in midground/background
      pos[i * 3 + 2] = (Math.random() - 0.7) * 35;

      // Color from palette
      const color = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      spd[i] = (Math.random() * 0.08 + 0.02) * speedMultiplier;
    }
    
    return [pos, col, spd];
  }, [count]);

  const dotTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const positionsAttr = points.current.geometry.attributes.position;
    
    // Parallax mouse interaction
    const mx = state.pointer.x * 1.5;
    const my = state.pointer.y * 1.5;

    for (let i = 0; i < count; i++) {
      // Slow drift & wave motion combined with mouse parallax
      const wave = Math.sin(time * speeds[i] * 0.5 + i) * 0.15;
      positionsAttr.setY(i, positions[i * 3 + 1] + wave + my * speeds[i] * 6);
      positionsAttr.setX(i, positions[i * 3] + Math.cos(time * speeds[i] * 0.3 + i) * 0.15 + mx * speeds[i] * 6);
    }
    positionsAttr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
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
  );
}

export function Environments({ mode, combo }: Props) {
  const intensity = 1 + Math.min(combo * 0.1, 2);

  if (mode === 'SYNTHWAVE') {
    return (
      <>
        <color attach="background" args={['#1a0524']} />
        <ambientLight intensity={0.6 * intensity} />
        <pointLight position={[0, 5, -20]} intensity={2 * intensity} color="#ff007f" />
        <pointLight position={[0, -5, 10]} intensity={1 * intensity} color="#b026ff" />
        
        {/* Retrowave Sun */}
        <mesh position={[0, 2, -25]}>
          <circleGeometry args={[12, 64]} />
          <meshBasicMaterial color="#ff007f" transparent opacity={0.9} />
        </mesh>
        
        <Grid 
          position={[0, -3.2, 0]} 
          args={[50, 50]} 
          cellSize={1.5} 
          cellThickness={1.5} 
          cellColor="#ff007f" 
          sectionSize={6} 
          sectionThickness={2.5} 
          sectionColor="#b026ff" 
          fadeDistance={40} 
          infiniteGrid 
        />
      </>
    );
  }

  if (mode === 'CYBERPUNK') {
    return (
      <>
        <color attach="background" args={['#000a00']} />
        <ambientLight intensity={0.3 * intensity} />
        <pointLight position={[10, 10, 10]} intensity={1.5 * intensity} color="#39ff14" />
        <pointLight position={[-10, 5, -10]} intensity={1 * intensity} color="#00f3ff" />
        
        <Sparkles count={400} scale={20} size={2.5} speed={1.2 * intensity} color="#39ff14" opacity={0.6} />
        <Sparkles count={100} scale={15} size={1} speed={0.5 * intensity} color="#00f3ff" opacity={0.3} />
        
        <Grid 
          position={[0, -3.2, 0]} 
          args={[40, 40]} 
          cellSize={0.8} 
          cellThickness={1} 
          cellColor="#003300" 
          sectionSize={4} 
          sectionThickness={1.5} 
          sectionColor="#39ff14" 
          fadeDistance={30} 
          infiniteGrid 
        />
      </>
    );
  }

  // NEON (Default Cohesive Spatial Computing Space)
  return (
    <>
      {/* Fog for receding grid blending */}
      <fogExp2 attach="fog" args={['#030305', 0.05]} />
      
      {/* Cohesive background gradient instead of flat black */}
      <BackgroundGradient />
      
      <ambientLight intensity={0.25 * intensity} />
      
      {/* General neon ambient highlights */}
      <pointLight position={[15, 10, 10]} intensity={1.2 * intensity} color="#00f3ff" />
      <pointLight position={[-15, -10, -10]} intensity={1.0 * intensity} color="#b026ff" />
      
      {/* Dynamic colorful particle field */}
      <DepthParticles count={250} intensity={intensity} />
      
      {/* Subtle reflective floor underneath the grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.21, 0]}>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={512}
          mixBlur={1.0}
          mixStrength={0.4}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#030308"
          metalness={0.6}
          mirror={1}
        />
      </mesh>

      {/* Grid Floor */}
      <Grid 
        position={[0, -3.2, 0]} 
        args={[35, 35]} 
        cellSize={0.6} 
        cellThickness={0.8} 
        cellColor="#12121e" 
        sectionSize={3} 
        sectionThickness={1.2} 
        sectionColor="#b026ff" 
        fadeDistance={25} 
        infiniteGrid 
      />
    </>
  );
}
