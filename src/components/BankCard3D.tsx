import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

export interface BankCardProps {
  name: string;
  brandColor: string;
  ussd: string;
  license: string;
  position: [number, number, number];
  rotationY: number;
  isSelected: boolean;
  onClick: () => void;
}

export function BankCard3D({
  name,
  brandColor,
  ussd,
  license,
  position,
  rotationY,
  isSelected,
  onClick,
}: BankCardProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const floatDelay = useMemo(() => Math.random() * Math.PI * 2, []);

  // Generate dynamic credit card canvas texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Rounded card shape
      ctx.fillStyle = '#0a0d1a';
      ctx.beginPath();
      ctx.roundRect(0, 0, 512, 320, 24);
      ctx.fill();

      // Subtle cyber grid lines on background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 512; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 320);
        ctx.stroke();
      }
      for (let j = 0; j < 320; j += 20) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(512, j);
        ctx.stroke();
      }

      // Draw metallic background gradient
      const grad = ctx.createLinearGradient(0, 0, 512, 320);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.7)');
      grad.addColorStop(1, 'rgba(3, 7, 18, 0.95)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(0, 0, 512, 320, 24);
      ctx.fill();

      // Glowing Neon border using bank brand color
      ctx.shadowColor = brandColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = brandColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(6, 6, 500, 308, 20);
      ctx.stroke();

      // Reset shadows for card details
      ctx.shadowBlur = 0;

      // Draw gold-plated SIM Chip
      const chipGrad = ctx.createLinearGradient(40, 100, 100, 148);
      chipGrad.addColorStop(0, '#f59e0b');
      chipGrad.addColorStop(0.5, '#fbbf24');
      chipGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = chipGrad;
      ctx.beginPath();
      ctx.roundRect(40, 100, 60, 48, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(48, 108, 44, 32);

      // Bank Brand Name (JejuStoneWall)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px JejuStoneWall, sans-serif';
      ctx.fillText(name, 40, 65);

      // License tag (NanumSquareRound)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '500 12px NanumSquareRound, sans-serif';
      ctx.fillText(license.toUpperCase(), 40, 85);

      // USSD Code colored by brandColor (NanumSquareRound)
      ctx.fillStyle = brandColor;
      ctx.font = 'bold 24px NanumSquareRound, sans-serif';
      ctx.fillText(`USSD: ${ussd}`, 40, 200);

      // Bottom Metadata
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '12px NanumSquareRound, sans-serif';
      ctx.fillText("WAZOBIA AI CHATBOT", 40, 260);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px JejuStoneWall, sans-serif';
      ctx.fillText("CLICK TO CHAT & VOICE", 40, 280);

      // Interactive NFC circles colored by brandColor
      ctx.fillStyle = brandColor;
      ctx.beginPath();
      ctx.arc(430, 240, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(460, 240, 36, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [name, brandColor, ussd, license]);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Hover scales & camera offsets
    const time = state.clock.getElapsedTime();
    const floatOffset = Math.sin(time * 1.8 + floatDelay) * 0.05;

    // Smooth hover scaling
    let targetScale = isSelected ? 1.15 : isHovered ? 1.08 : 1.0;
    let targetX = position[0];
    let targetY = position[1] + floatOffset;
    let targetZ = position[2];

    if (isSelected) {
      targetY = 0.3; // Push upwards slightly when selected
      targetZ = position[2] + 0.5; // Zoom out/forward
    }

    // Lerp positions & scales
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.1);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.1);

    // Hover tilt effect
    let targetRotX = 0;
    let targetRotY = rotationY;

    if (isHovered && !isSelected) {
      targetRotX = mousePos.current.y * 0.3;
      targetRotY = rotationY + mousePos.current.x * 0.3;
    }

    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.12);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.12);
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.12));
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (meshRef.current) {
      // Compute mouse position relative to mesh center [-1, 1]
      const box = new THREE.Box3().setFromObject(meshRef.current);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const relativeX = (e.point.x - center.x) / (box.max.x - box.min.x);
      const relativeY = (e.point.y - center.y) / (box.max.y - box.min.y);
      mousePos.current = { x: relativeX, y: -relativeY };
    }
  };

  return (
    <group
      ref={meshRef}
      position={[position[0], position[1], position[2]]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setIsHovered(false);
        document.body.style.cursor = 'default';
      }}
      onPointerMove={handlePointerMove}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Front Face: Dynamic Texture */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.5, 1.56, 0.05]} />
        <meshBasicMaterial map={texture} transparent opacity={0.95} />
      </mesh>
      {/* Outer Glow ring (active when hovered) */}
      {(isHovered || isSelected) && (
        <mesh position={[0, 0, -0.01]} scale={1.03}>
          <planeGeometry args={[2.5, 1.56]} />
          <meshBasicMaterial
            color={brandColor}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
