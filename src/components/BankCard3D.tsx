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
  const glowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const floatDelay = useMemo(() => Math.random() * Math.PI * 2, []);

  // Generate dynamic premium credit card texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Sleek background dark fill
      ctx.fillStyle = '#05070e';
      ctx.fillRect(0, 0, 512, 320);

      // Subtle abstract glowing arc overlay
      const radialGrad = ctx.createRadialGradient(256, 160, 50, 256, 160, 300);
      radialGrad.addColorStop(0, 'rgba(30, 41, 59, 0.4)');
      radialGrad.addColorStop(1, 'rgba(3, 7, 18, 0.95)');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, 512, 320);

      // Draw cyber circuits grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 512; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 320);
        ctx.stroke();
      }
      for (let j = 0; j < 320; j += 16) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(512, j);
        ctx.stroke();
      }

      // Neon outline inside card
      ctx.strokeStyle = brandColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = brandColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(10, 10, 492, 300, 16);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Chip details
      const chipGrad = ctx.createLinearGradient(40, 100, 100, 148);
      chipGrad.addColorStop(0, '#f59e0b');
      chipGrad.addColorStop(0.5, '#fbbf24');
      chipGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = chipGrad;
      ctx.beginPath();
      ctx.roundRect(40, 95, 56, 44, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(46, 101, 44, 32);

      // Wifi/NFC waves
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(125, 117, 8 + i * 5, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
      }

      // Bank Brand Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px Outfit, sans-serif';
      ctx.fillText(name, 40, 60);

      // License type tag
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '700 11px Space Grotesk, sans-serif';
      ctx.fillText(license.toUpperCase(), 40, 78);

      // USSD Code
      ctx.fillStyle = brandColor;
      ctx.font = 'bold 22px Space Grotesk, sans-serif';
      ctx.fillText(`USSD: ${ussd}`, 40, 195);

      // Monogram text inside circles
      ctx.fillStyle = brandColor;
      ctx.beginPath();
      ctx.arc(430, 240, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.arc(460, 240, 36, 0, Math.PI * 2);
      ctx.fill();

      // Bottom Platform Metadata
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '10px Space Grotesk, sans-serif';
      ctx.fillText("SECURE BANKING HUB", 40, 255);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 13px Outfit, sans-serif';
      ctx.fillText("CLICK TO ESTABLISH LINK", 40, 275);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [name, brandColor, ussd, license]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    
    // Animate glowing outline opacity dynamically on GPU
    if (glowMaterialRef.current) {
      glowMaterialRef.current.opacity = 0.35 + Math.sin(time * 4 + floatDelay) * 0.2;
    }

    // Hover scales & camera offsets
    const floatOffset = Math.sin(time * 1.5 + floatDelay) * 0.04;
    let targetScale = isSelected ? 1.15 : isHovered ? 1.08 : 1.0;
    let targetX = position[0];
    let targetY = position[1] + floatOffset;
    let targetZ = position[2];

    if (isSelected) {
      targetY = 0.28;
      targetZ = position[2] + 0.6;
    }

    // Lerp positions & scales
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.1);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.1);

    // Hover tilt physics
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
      {/* Dynamic Front texture mapped onto thin box */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.5, 1.56, 0.04]} />
        <meshPhysicalMaterial
          map={texture}
          transparent
          opacity={0.88}
          roughness={0.15}
          metalness={0.2}
          transmission={0.65}
          thickness={0.5}
          clearcoat={1.0}
          clearcoatRoughness={0.08}
          ior={1.45}
        />
      </mesh>

      {/* Holographic glowing wireframe edge outline */}
      <mesh position={[0, 0, 0]} scale={1.015}>
        <boxGeometry args={[2.5, 1.56, 0.04]} />
        <meshBasicMaterial
          ref={glowMaterialRef}
          color={brandColor}
          wireframe
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
