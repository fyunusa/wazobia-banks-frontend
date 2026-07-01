import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function StarsBackground() {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate 800 random star positions
  const positions = useMemo(() => {
    const pos = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      // Position within a sphere of radius 40
      const r = 15 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      // Slowly rotate starfield
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
      pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.008;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#c5a880"
        sizeAttenuation={true}
        transparent={true}
        opacity={0.35}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
