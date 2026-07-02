import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { BankSceneGraph } from './BankSceneGraph';
import type { BankData } from './BankSceneGraph';

interface ScrollSceneProps {
  banks: BankData[];
  selectedSlug: string | null;
  onSelectBank: (slug: string) => void;
}

export function ScrollScene({ banks, selectedSlug, onSelectBank }: ScrollSceneProps) {
  const scroll = useScroll();
  const { camera } = useThree();
  const pointLightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const t = scroll.offset; // 0 → 1
    const s = t * 4;        // 0 → 4 (section float)

    // ── Camera Z: Pull in from far → mid → close ────────────
    // Section 0 (hero): z = 11 (distant, panoramic)
    // Section 1 (pan):  z = 5  (zoom into cards)
    // Section 2 (grid): z = 7  (step back to see grid)
    // Section 3 (feat): z = 4  (close to feature card)
    // Section 4 (CTA):  z = 6  (medium shot of convergence)
    const zKeyframes = [11, 5, 7, 4, 6];
    const targetZ = sampleCurve(zKeyframes, s / 4);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);

    // ── Camera Y: slight raise in middle sections ───────────
    const yKeyframes = [0.4, 0.4, 0.8, 0.2, 0.5];
    const targetY = sampleCurve(yKeyframes, s / 4);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.04);

    // ── Camera X: gentle horizontal drift ───────────────────
    const xKeyframes = [0, 0, 0.5, 0, 0];
    const targetX = sampleCurve(xKeyframes, s / 4);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.04);

    // Look at scene center always
    camera.lookAt(0, 0, 0);

    // ── Accent point light color transitions with scroll ────
    if (pointLightRef.current) {
      const hue = t * 0.5; // slow hue shift 0→0.5
      pointLightRef.current.color.setHSL(hue, 0.8, 0.6);
      pointLightRef.current.intensity = 1.8 + Math.sin(t * Math.PI * 4) * 0.3;
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.7} color="#8b9ff4" />
      <pointLight ref={pointLightRef} position={[0, 3, 3]} intensity={1.8} color="#6366f1" />
      <pointLight position={[0, -5, 0]} intensity={0.4} color="#1e1b4b" />

      {/* Environment for reflections on the physical material cards */}
      <Environment preset="city" />

      {/* Bank Cards */}
      <BankSceneGraph
        banks={banks}
        selectedSlug={selectedSlug}
        onSelectBank={onSelectBank}
      />
    </>
  );
}

// Linearly interpolate along an array of keyframe values based on a 0→1 t
function sampleCurve(keyframes: number[], t: number): number {
  const n = keyframes.length - 1;
  const i = Math.min(Math.floor(t * n), n - 1);
  const frac = t * n - i;
  return keyframes[i] + (keyframes[i + 1] - keyframes[i]) * frac;
}
