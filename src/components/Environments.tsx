import { Stars, Sparkles, Grid } from '@react-three/drei';

export type EnvMode = 'NEON' | 'SYNTHWAVE' | 'CYBERPUNK';

interface Props {
  mode: EnvMode;
  combo: number;
}

export function Environments({ mode, combo }: Props) {
  // Sync background intensity/speed with combo
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
        
        {/* Matrix Rain effect using Sparkles */}
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

  // NEON (Default)
  return (
    <>
      <color attach="background" args={['#030305']} />
      <ambientLight intensity={0.4 * intensity} />
      <pointLight position={[10, 10, 10]} intensity={1.5 * intensity} color="#00f3ff" />
      <pointLight position={[-10, -10, -10]} intensity={1.5 * intensity} color="#b026ff" />
      
      <Stars radius={100} depth={50} count={1200} factor={4} saturation={0.5} fade speed={1.2 * intensity} />
      <Sparkles count={50} scale={10} size={1.5} speed={0.4 * intensity} color="#00f3ff" />
      <Sparkles count={50} scale={10} size={1.5} speed={0.4 * intensity} color="#b026ff" />
      
      <Grid 
        position={[0, -3.2, 0]} 
        args={[30, 30]} 
        cellSize={0.6} 
        cellThickness={0.8} 
        cellColor="#181824" 
        sectionSize={3} 
        sectionThickness={1.2} 
        sectionColor="#b026ff" 
        fadeDistance={20} 
        infiniteGrid 
      />
    </>
  );
}
