import { useRef, useEffect } from 'react';
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
  carouselAngle: number;
  setCarouselAngle: (angle: number) => void;
}

export function BankCarousel3D({
  banks,
  selectedSlug,
  onSelectBank,
  carouselAngle,
  setCarouselAngle,
}: BankCarouselProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentAngle = useRef(0);
  const { size } = useThree();

  const radius = 5.2; // Radius of the 3D ring
  const numBanks = banks.length;

  // Align carousel when selection changes from the list or layout
  useEffect(() => {
    if (selectedSlug) {
      const idx = banks.findIndex((b) => b.slug === selectedSlug);
      if (idx !== -1) {
        // Calculate the angle required to center this bank card at the front (theta = 0)
        const target = - (idx * Math.PI * 2) / numBanks;
        setCarouselAngle(target);
      }
    }
  }, [selectedSlug, banks, numBanks, setCarouselAngle]);

  useFrame(() => {
    if (!groupRef.current) return;

    // Smoothly lerp current angle to target angle
    currentAngle.current = THREE.MathUtils.lerp(currentAngle.current, carouselAngle, 0.07);
    groupRef.current.rotation.y = currentAngle.current;

    // Smoothly shift group coordinates leftwards and back when selected to clear space for the chat console
    const targetX = selectedSlug ? -1.8 : 0;
    const targetZ = selectedSlug ? -1.2 : 0;
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.07);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.07);
  });

  // Custom pointer drag handlers for rotating the carousel
  const isDragging = useRef(false);
  const previousX = useRef(0);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    isDragging.current = true;
    previousX.current = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging.current) return;
    e.stopPropagation();
    const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const deltaX = x - previousX.current;
    
    // Sensitivity scaled by viewport size
    const sensitivity = (Math.PI * 2) / size.width;
    setCarouselAngle(carouselAngle + deltaX * sensitivity * 1.2);
    previousX.current = x;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {banks.map((bank, index) => {
        // Calculate original static angle for this card
        const cardStaticAngle = (index * Math.PI * 2) / numBanks;
        
        // Position card along the ring circumference
        const x = radius * Math.sin(cardStaticAngle);
        const z = radius * Math.cos(cardStaticAngle);
        
        // Make the cards face outward from the center
        const cardRotationY = cardStaticAngle;

        return (
          <BankCard3D
            key={bank.slug}
            name={bank.name}
            brandColor={bank.brandColor}
            ussd={bank.ussd}
            license={bank.license}
            position={[x, 0, z]}
            rotationY={cardRotationY}
            isSelected={selectedSlug === bank.slug}
            onClick={() => onSelectBank(bank.slug)}
          />
        );
      })}
    </group>
  );
}
