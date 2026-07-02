import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
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

interface BankSceneGraphProps {
  banks: BankData[];
  selectedSlug: string | null;
  onSelectBank: (slug: string) => void;
}

// Compute card positions for each scroll section
function computePositions(
  index: number,
  total: number,
  section: number // 0–4 float
): [number, number, number] {
  const t = section;

  // ── Section 0: Ring formation (hero) ──────────────────────
  const ringRadius = Math.min(6.5, 3.5 + total * 0.18);
  const ringAngle = (index / total) * Math.PI * 2;
  const ringX = Math.sin(ringAngle) * ringRadius;
  const ringZ = Math.cos(ringAngle) * ringRadius - 1.5;
  const ringY = 0;

  // ── Section 1: Same ring but camera moves in (cards stay) ──
  // No change to card positions; camera does the work

  // ── Section 2: 3D Grid formation ──────────────────────────
  const cols = Math.ceil(Math.sqrt(total));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const gridW = cols * 2.4;
  const gridH = Math.ceil(total / cols) * 3.2;
  const gridX = col * 2.4 - gridW / 2 + 1.2;
  const gridY = -(row * 3.2 - gridH / 2 + 1.6) * 0.5;
  const gridZ = -2;

  // ── Section 3: Feature formation (one center, rest orbit) ──
  const featX = index === 0 ? 0 : Math.sin((index / total) * Math.PI * 2) * 5.5;
  const featY = index === 0 ? 0 : Math.cos((index / total) * Math.PI * 2) * 2.2;
  const featZ = index === 0 ? 0 : -3;

  // ── Section 4: Convergence — all converge to grid ──────────
  // Reuse grid but tighter
  const convX = col * 2.1 - (cols * 2.1) / 2 + 1.05;
  const convY = -(row * 2.8 - (Math.ceil(total / cols) * 2.8) / 2 + 1.4) * 0.45;
  const convZ = -1;

  // Blend between sections
  const s = THREE.MathUtils.clamp(t, 0, 4);

  let x: number, y: number, z: number;

  if (s < 1) {
    // Section 0→1: Ring (camera moves)
    x = ringX; y = ringY; z = ringZ;
  } else if (s < 2) {
    // Section 1→2: Ring → Grid
    const p = s - 1;
    x = THREE.MathUtils.lerp(ringX, gridX, smoothstep(p));
    y = THREE.MathUtils.lerp(ringY, gridY, smoothstep(p));
    z = THREE.MathUtils.lerp(ringZ, gridZ, smoothstep(p));
  } else if (s < 3) {
    // Section 2→3: Grid → Feature
    const p = s - 2;
    x = THREE.MathUtils.lerp(gridX, featX, smoothstep(p));
    y = THREE.MathUtils.lerp(gridY, featY, smoothstep(p));
    z = THREE.MathUtils.lerp(gridZ, featZ, smoothstep(p));
  } else {
    // Section 3→4: Feature → Convergence (tight grid)
    const p = THREE.MathUtils.clamp(s - 3, 0, 1);
    x = THREE.MathUtils.lerp(featX, convX, smoothstep(p));
    y = THREE.MathUtils.lerp(featY, convY, smoothstep(p));
    z = THREE.MathUtils.lerp(featZ, convZ, smoothstep(p));
  }

  return [x, y, z];
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function BankSceneGraph({ banks, selectedSlug, onSelectBank }: BankSceneGraphProps) {
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null);
  // Store live lerped section position
  const sectionRef = useRef(0);

  // Precompute static ring angles for consistent rotation facing
  const ringAngles = useMemo(() =>
    banks.map((_, i) => (i / banks.length) * Math.PI * 2),
    [banks]
  );

  useFrame(() => {
    const offset = scroll.offset; // 0 → 1
    const targetSection = offset * 4; // 0 → 4
    sectionRef.current = THREE.MathUtils.lerp(sectionRef.current, targetSection, 0.04);

    if (groupRef.current) {
      // Slow auto-rotation on the whole group in section 0
      const autoRotStrength = THREE.MathUtils.clamp(1 - sectionRef.current * 2, 0, 1);
      groupRef.current.rotation.y += 0.0008 * autoRotStrength;
    }
  });

  return (
    <group ref={groupRef}>
      {banks.map((bank, index) => {
        return (
          <ScrollCard
            key={bank.slug}
            bank={bank}
            index={index}
            total={banks.length}
            staticAngle={ringAngles[index]}
            selectedSlug={selectedSlug}
            onSelectBank={onSelectBank}
            sectionRef={sectionRef}
          />
        );
      })}
    </group>
  );
}

// Individual card component that reads live sectionRef for position
interface ScrollCardProps {
  bank: BankData;
  index: number;
  total: number;
  staticAngle: number;
  selectedSlug: string | null;
  onSelectBank: (slug: string) => void;
  sectionRef: React.RefObject<number>;
}

function ScrollCard({ bank, index, total, staticAngle, selectedSlug, onSelectBank, sectionRef }: ScrollCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scroll = useScroll();

  useFrame((state) => {
    if (!groupRef.current) return;

    const section = sectionRef.current ?? 0;
    const [tx, ty, tz] = computePositions(index, total, section);

    // Smooth lerp to target position
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, tx, 0.05);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, ty, 0.05);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, tz, 0.05);

    // Card rotation — face forward in section 0, face camera in grid sections
    const ringFacing = staticAngle;
    const flatFacing = 0;
    const facingBlend = THREE.MathUtils.clamp(section - 1, 0, 1);
    const targetRotY = THREE.MathUtils.lerp(ringFacing, flatFacing, smoothstep(facingBlend));
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.06);

    // Float bob
    const floatPhase = index * 0.65;
    const t = state.clock.elapsedTime;
    const floatStrength = THREE.MathUtils.clamp(1 - Math.abs(section - 2) * 0.5, 0.02, 1);
    groupRef.current.children[0]?.position.set(0, Math.sin(t * 0.55 + floatPhase) * 0.06 * floatStrength, 0);

    // Scale: selected card larger in section 3
    const isFeature = index === 0 && section > 2.5 && section < 3.5;
    const isSelected = selectedSlug === bank.slug;
    const targetScale = isFeature ? 1.5 : isSelected ? 1.12 : 1.0;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.06)
    );
  });

  return (
    <group ref={groupRef}>
      <group> {/* inner group for float animation */}
        <BankCard3D
          name={bank.name}
          slug={bank.slug}
          brandColor={bank.brandColor}
          ussd={bank.ussd}
          license={bank.license}
          position={[0, 0, 0]}
          rotationY={0}
          isSelected={selectedSlug === bank.slug}
          onClick={() => onSelectBank(bank.slug)}
          scrollOffset={scroll.offset}
          cardIndex={index}
          totalCards={total}
        />
      </group>
    </group>
  );
}
