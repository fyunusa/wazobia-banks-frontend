import { useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BankCard3D } from './BankCard3D';

export interface BankData {
  slug: string;
  name: string;
  full_name: string;
  brandColor: string;
  ussd: string;
  license: string;
}

interface BankCarouselProps {
  banks: BankData[];
  selectedSlug: string | null;
  onSelectBank: (slug: string) => void;
}

/**
 * CoverFlow-style 3D carousel:
 * - Cards arc in a semicircle, facing forward
 * - Drag left/right to rotate through banks
 * - Front-center card is largest and clearest
 * - Side cards tilt away (coverflow effect)
 */
export function BankCarousel3D({ banks, selectedSlug, onSelectBank }: BankCarouselProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetAngleRef = useRef(0);
  const currentAngleRef = useRef(0);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const { size } = useThree();

  // How many cards are visible spread + tilt
  const SPACING_ANGLE = (2 * Math.PI) / banks.length;
  const RADIUS = 6.5; // Ring radius — enough space so cards aren't zoomed in

  // Figure out which card is closest to front (angle = 0)
  const getFrontIndex = () => {
    const angle = currentAngleRef.current;
    const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const idx = Math.round(normalized / SPACING_ANGLE) % banks.length;
    return (banks.length - idx) % banks.length;
  };

  // Pointer drag handling
  const handlePointerDown = useCallback((e: any) => {
    isDragging.current = true;
    lastX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  }, []);

  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging.current) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const dx = x - lastX.current;
    const sensitivity = (2 * Math.PI) / size.width * 1.5;
    targetAngleRef.current += dx * sensitivity;
    lastX.current = x;
  }, [size.width]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    // Snap to nearest card
    const snapped = Math.round(targetAngleRef.current / SPACING_ANGLE) * SPACING_ANGLE;
    targetAngleRef.current = snapped;
  }, [SPACING_ANGLE]);

  useFrame(() => {
    // Smooth lerp to target
    currentAngleRef.current = THREE.MathUtils.lerp(
      currentAngleRef.current,
      targetAngleRef.current,
      0.09
    );
    if (groupRef.current) {
      groupRef.current.rotation.y = currentAngleRef.current;
    }
  });

  const frontIdx = getFrontIndex();

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {banks.map((bank, i) => {
        // Each card's static angle in the ring
        const cardAngle = (i / banks.length) * Math.PI * 2;
        const x = Math.sin(cardAngle) * RADIUS;
        const z = Math.cos(cardAngle) * RADIUS;

        // Coverflow tilt: cards on the sides tilt away
        const rotY = cardAngle;

        const isFront = i === frontIdx;

        return (
          <BankCard3D
            key={bank.slug}
            name={bank.name}
            slug={bank.slug}
            brandColor={bank.brandColor}
            ussd={bank.ussd}
            license={bank.license}
            position={[x, 0, z]}
            rotationY={rotY}
            isSelected={selectedSlug === bank.slug}
            isFocused={isFront}
            onClick={() => onSelectBank(bank.slug)}
          />
        );
      })}
    </group>
  );
}
