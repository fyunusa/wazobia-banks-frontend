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
      // Solid base plate (Slate matte black)
      ctx.fillStyle = '#141519';
      ctx.beginPath();
      ctx.roundRect(0, 0, 512, 320, 24);
      ctx.fill();

      // Minimal premium texture overlay (very faint vertical accent lines)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
      ctx.lineWidth = 1;
      for (let i = 20; i < 500; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 20);
        ctx.lineTo(i, 300);
        ctx.stroke();
      }

      // Elegant solid sand-gold border (no neon shadows)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isSelected ? '#c5a880' : isHovered ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(4, 4, 504, 312, 20);
      ctx.stroke();

      // Faint organic watermark monogram in background
      ctx.fillStyle = 'rgba(197, 168, 128, 0.02)';
      ctx.font = '800 130px JejuStoneWall, sans-serif';
      ctx.fillText(name.substring(0, 3).toUpperCase(), 140, 205);

      // Gold SIM Chip
      const chipGrad = ctx.createLinearGradient(40, 105, 90, 145);
      chipGrad.addColorStop(0, '#c5a880');
      chipGrad.addColorStop(0.5, '#ebdcb9');
      chipGrad.addColorStop(1, '#a6875b');
      ctx.fillStyle = chipGrad;
      ctx.beginPath();
      ctx.roundRect(40, 105, 50, 40, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(46, 111, 38, 28);

      // Bank Brand Name (JejuStoneWall)
      ctx.fillStyle = '#f5f4f0';
      ctx.font = 'bold 36px JejuStoneWall, sans-serif';
      ctx.fillText(name, 40, 68);

      // License Category Pill (Gold Sand)
      ctx.fillStyle = '#c5a880';
      ctx.font = 'bold 12px JejuStoneWall, sans-serif';
      ctx.fillText(license.toUpperCase(), 40, 92);

      // USSD Code (NanumSquareRound)
      ctx.fillStyle = '#f5f4f0';
      ctx.font = 'bold 24px NanumSquareRound, sans-serif';
      ctx.fillText(`USSD: ${ussd}`, 40, 195);

      // Bottom Metadata
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '12px NanumSquareRound, sans-serif';
      ctx.fillText("WAZOBIA BANKING SUITE", 40, 255);
      
      ctx.fillStyle = '#c5a880';
      ctx.font = 'bold 13px JejuStoneWall, sans-serif';
      ctx.fillText("OPEN SYSTEM CONSOLE →", 40, 280);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [name, brandColor, ussd, license, isSelected, isHovered]);

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

      {/* Outer Border outline frame (active when selected or hovered) */}
      {(isHovered || isSelected) && (
        <mesh position={[0, 0, -0.026]} scale={1.025}>
          <planeGeometry args={[2.5, 1.56]} />
          <meshBasicMaterial
            color={isSelected ? '#c5a880' : 'rgba(255,255,255,0.45)'}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
