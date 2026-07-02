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
  onClick: () => void;
  scrollOffset?: number;
  cardIndex?: number;
  totalCards?: number;
}

export function BankCard3D({
  name,
  // slug intentionally unused (kept in interface for future texture loading)
  brandColor,
  ussd,
  license,
  position,
  rotationY,
  isSelected,
  onClick,
  scrollOffset = 0,
  cardIndex = 0,
  totalCards = 1,
}: BankCard3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = new THREE.Color(brandColor);

  // Stagger delay per card for entrance animation
  const staggerDelay = cardIndex / totalCards;
  const entranceProgress = THREE.MathUtils.clamp(
    (scrollOffset * 5 - staggerDelay * 0.8) * 2, 0, 1
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Float animation — unique phase per card
    const floatPhase = cardIndex * 0.7;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.6 + floatPhase) * 0.08;

    // Entrance scale animation
    const eased = entranceProgress < 0.5
      ? 2 * entranceProgress * entranceProgress
      : -1 + (4 - 2 * entranceProgress) * entranceProgress;
    const targetScale = isSelected ? 1.15 : hovered ? 1.05 : 1.0;
    const finalScale = Math.max(eased * targetScale, 0.01);
    groupRef.current.scale.setScalar(
      THREE.MathUtils.lerp(groupRef.current.scale.x, finalScale, 0.08)
    );

    // Hover tilt
    if (meshRef.current) {
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        hovered && !isSelected ? 0.08 : 0,
        0.08
      );
    }

    // Glow pulse when selected or hovered
    if (glowRef.current) {
      const targetOpacity = isSelected
        ? 0.25 + Math.sin(t * 2) * 0.05
        : hovered ? 0.12 : 0;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
        (glowRef.current.material as THREE.MeshBasicMaterial).opacity,
        targetOpacity,
        0.1
      );
    }
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
      {/* Outer glow ring */}
      <mesh ref={glowRef}>
        <ringGeometry args={[1.15, 1.55, 64]} />
        <meshBasicMaterial
          color={brandColor}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Card body */}
      <RoundedBox
        ref={meshRef}
        args={[1.8, 2.6, 0.06]}
        radius={0.12}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={brandColor}
          metalness={0.15}
          roughness={0.25}
          clearcoat={1.0}
          clearcoatRoughness={0.08}
          reflectivity={0.6}
          envMapIntensity={1.2}
          emissive={color}
          emissiveIntensity={isSelected ? 0.18 : hovered ? 0.10 : 0.04}
        />
      </RoundedBox>

      {/* Bank name */}
      <Text
        position={[0, 0.8, 0.05]}
        fontSize={0.22}
        fontWeight="bold"
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="rgba(0,0,0,0.4)"
        maxWidth={1.5}
      >
        {name}
      </Text>

      {/* USSD code */}
      <Text
        position={[0, 0.45, 0.05]}
        fontSize={0.13}
        color="rgba(255,255,255,0.75)"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
      >
        {ussd}
      </Text>

      {/* License badge */}
      <Text
        position={[0, -0.85, 0.05]}
        fontSize={0.095}
        color="rgba(255,255,255,0.55)"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
      >
        {license.toUpperCase()}
      </Text>

      {/* Divider line */}
      <mesh position={[0, 0.25, 0.04]}>
        <planeGeometry args={[1.3, 0.006]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>

      {/* Bottom accent bar */}
      <mesh position={[0, -1.1, 0.04]}>
        <planeGeometry args={[1.5, 0.018]} />
        <meshBasicMaterial color={brandColor} transparent opacity={0.8} />
      </mesh>

      {/* Selected indicator ring */}
      {isSelected && (
        <mesh position={[0, 0, -0.04]}>
          <ringGeometry args={[1.0, 1.08, 64]} />
          <meshBasicMaterial
            color={brandColor}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
