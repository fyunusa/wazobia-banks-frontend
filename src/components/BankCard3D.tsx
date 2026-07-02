import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';

interface BankCard3DProps {
  name: string;
  slug: string;
  brandColor: string;
  ussd: string;
  license: string;
  position: [number, number, number];
  rotationY: number;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
}

// Card dimensions — tweak here to resize everything consistently
const W = 1.9;  // card width
const H = 2.8;  // card height
const D = 0.08; // card depth

export function BankCard3D({
  name,
  brandColor,
  ussd,
  license,
  position,
  rotationY,
  isSelected,
  isFocused,
  onClick,
}: BankCard3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const emissiveColor = new THREE.Color(brandColor);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Gentle float bob — different phase per card
    const floatY = Math.sin(t * 0.65 + position[0] * 0.8) * 0.05;
    groupRef.current.position.set(position[0], position[1] + floatY, position[2]);
    groupRef.current.rotation.y = rotationY;

    // Scale based on state
    const targetScale = isSelected ? 1.10 : isFocused ? 1.05 : hovered ? 1.03 : 1.0;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1)
    );
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {/* ── Card body ── */}
      <RoundedBox args={[W, H, D]} radius={0.12} smoothness={4}>
        <meshPhysicalMaterial
          color={brandColor}
          metalness={0.15}
          roughness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.06}
          reflectivity={0.7}
          emissive={emissiveColor}
          emissiveIntensity={isSelected ? 0.20 : isFocused ? 0.13 : hovered ? 0.08 : 0.04}
        />
      </RoundedBox>

      {/* ── Dark top band ── */}
      <mesh position={[0, H / 2 - 0.22, D / 2 + 0.002]}>
        <planeGeometry args={[W, 0.44]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>

      {/* ── Bank name ── */}
      <Text
        position={[0, H / 2 - 0.55, D / 2 + 0.01]}
        fontSize={0.24}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={W - 0.2}
      >
        {name}
      </Text>

      {/* ── Separator ── */}
      <mesh position={[0, H / 2 - 0.88, D / 2 + 0.002]}>
        <planeGeometry args={[W - 0.5, 0.004]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
      </mesh>

      {/* ── USSD code ── */}
      <Text
        position={[0, 0.1, D / 2 + 0.01]}
        fontSize={0.20}
        color="#dddddd"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
      >
        {ussd}
      </Text>

      {/* ── License tag ── */}
      <Text
        position={[0, -(H / 2 - 0.25), D / 2 + 0.01]}
        fontSize={0.10}
        color="#aaaaaa"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        {license.toUpperCase()}
      </Text>

      {/* ── Bottom accent bar ── */}
      <mesh position={[0, -(H / 2 - 0.06), D / 2 + 0.002]}>
        <planeGeometry args={[W - 0.3, 0.018]} />
        <meshBasicMaterial color={brandColor} transparent opacity={0.85} />
      </mesh>

      {/* ── Focus / selected ring ── */}
      {(isSelected || isFocused) && (
        <mesh position={[0, 0, -D / 2 - 0.01]}>
          <ringGeometry args={[1.05, 1.18, 64]} />
          <meshBasicMaterial
            color={brandColor}
            transparent
            opacity={isSelected ? 0.9 : 0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
