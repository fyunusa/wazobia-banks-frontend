import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { BankCarousel3D } from './components/BankCarousel3D';
import type { BankData } from './components/BankCarousel3D';
import { ChatPanel } from './components/ChatPanel';
import { AdminPortal } from './components/AdminPortal';
import { fetchInstitutions } from './services/api';
import { Settings } from 'lucide-react';

const FALLBACK_BANKS: BankData[] = [
  { slug: 'gtbank',     name: 'GTBank',        full_name: 'Guaranty Trust Bank',       brandColor: '#dd4f05', ussd: '*737#',     license: 'Commercial Bank' },
  { slug: 'zenith',     name: 'Zenith Bank',   full_name: 'Zenith Bank PLC',           brandColor: '#d30007', ussd: '*966#',     license: 'Commercial Bank' },
  { slug: 'access',     name: 'Access Bank',   full_name: 'Access Bank PLC',           brandColor: '#0088cc', ussd: '*901#',     license: 'Commercial Bank' },
  { slug: 'firstbank',  name: 'FirstBank',     full_name: 'First Bank of Nigeria',     brandColor: '#bf9b30', ussd: '*894#',     license: 'Commercial Bank' },
  { slug: 'uba',        name: 'UBA',           full_name: 'United Bank for Africa',    brandColor: '#e11d48', ussd: '*919#',     license: 'Commercial Bank' },
  { slug: 'union',      name: 'Union Bank',    full_name: 'Union Bank of Nigeria',     brandColor: '#009fe3', ussd: '*826#',     license: 'Commercial Bank' },
  { slug: 'sterling',   name: 'Sterling Bank', full_name: 'Sterling Bank PLC',         brandColor: '#c0392b', ussd: '*822#',     license: 'Commercial Bank' },
  { slug: 'wema',       name: 'Wema Bank',     full_name: 'Wema Bank PLC',             brandColor: '#8a1538', ussd: '*945#',     license: 'Commercial Bank' },
  { slug: 'fidelity',   name: 'Fidelity Bank', full_name: 'Fidelity Bank PLC',         brandColor: '#002d62', ussd: '*770#',     license: 'Commercial Bank' },
  { slug: 'fcmb',       name: 'FCMB',          full_name: 'First City Monument Bank',  brandColor: '#e6a817', ussd: '*329#',     license: 'Commercial Bank' },
  { slug: 'stanbic',    name: 'Stanbic IBTC',  full_name: 'Stanbic IBTC Bank',         brandColor: '#0033a0', ussd: '*909#',     license: 'Commercial Bank' },
  { slug: 'opay',       name: 'OPay',          full_name: 'OPay Digital Services',     brandColor: '#00b074', ussd: '*955#',     license: 'Mobile Money' },
  { slug: 'kuda',       name: 'Kuda Bank',     full_name: 'Kuda Microfinance Bank',    brandColor: '#40196d', ussd: '*894#',     license: 'Microfinance' },
  { slug: 'moniepoint', name: 'Moniepoint',    full_name: 'Moniepoint MFB',            brandColor: '#0052cc', ussd: '*5573#',    license: 'Microfinance' },
  { slug: 'palmpay',    name: 'PalmPay',       full_name: 'PalmPay Limited',           brandColor: '#7c3aed', ussd: '*652#',     license: 'Mobile Money' },
  { slug: 'jaiz',       name: 'Jaiz Bank',     full_name: 'Jaiz Bank PLC',             brandColor: '#006633', ussd: '*389*301#', license: 'Non-Interest' },
  { slug: 'eco',        name: 'Eco Bank',      full_name: 'Ecobank Nigeria',           brandColor: '#005b82', ussd: '*326#',     license: 'Commercial Bank' },
];

export default function App() {
  const [banks, setBanks] = useState<BankData[]>(FALLBACK_BANKS);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const selectedBank = banks.find((b) => b.slug === selectedSlug);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Fetch live institutions
  useEffect(() => {
    fetchInstitutions()
      .then((data) => {
        const merged = data.map((dyn) => {
          const local = FALLBACK_BANKS.find(l => l.slug === dyn.slug);
          return {
            slug: dyn.slug,
            name: dyn.name,
            full_name: dyn.full_name,
            brandColor: local?.brandColor || '#6366f1',
            ussd: dyn.ussd_code || local?.ussd || '*737#',
            license: dyn.cbn_license_type || local?.license || 'Commercial Bank',
          };
        });
        if (merged.length > 0) setBanks(merged);
      })
      .catch(() => {});
  }, []);

  // GSAP entrance animations
  useGSAP(() => {
    if (headerRef.current) {
      gsap.from(headerRef.current.children, {
        y: -30,
        opacity: 0,
        duration: 1.0,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 0.2,
      });
    }
    if (hintRef.current) {
      gsap.from(hintRef.current, {
        opacity: 0,
        y: 10,
        duration: 0.8,
        delay: 1.0,
        ease: 'power2.out',
      });
      // Gentle pulse hint
      gsap.to(hintRef.current, {
        opacity: 0.4,
        duration: 1.5,
        delay: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }
  }, []);

  return (
    <div className="app-root">

      {/* ── Full-Screen 3D Canvas ── */}
      <div className="canvas-fixed">
        <Canvas
          camera={{ position: [0, 0.3, 10], fov: 55 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
        >
          {/* Lighting */}
          <ambientLight intensity={0.7} />
          <directionalLight position={[4, 6, 4]} intensity={1.6} />
          <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#8899ff" />
          <pointLight position={[0, 4, 2]} intensity={1.2} color="#6366f1" />
          <pointLight position={[0, -3, 0]} intensity={0.3} color="#1e1b4b" />

          {/* Environment for physical material reflections */}
          <Environment preset="city" />

          {/* Bank Carousel */}
          <BankCarousel3D
            banks={banks}
            selectedSlug={selectedSlug}
            onSelectBank={setSelectedSlug}
          />
        </Canvas>
      </div>

      {/* ── Header — above 3D scene ── */}
      {!selectedSlug && (
        <div ref={headerRef} className="site-header">
          <div className="header-brand">
            <span className="header-dot" />
            <span className="header-title">Nigerian Banks</span>
          </div>
          <p className="header-sub">
            {banks.length} banks · Hausa · Yoruba · Igbo · Pidgin · English
          </p>
        </div>
      )}

      {/* ── Drag hint ── */}
      {!selectedSlug && (
        <div ref={hintRef} className="drag-hint">
          ← Drag to browse →  &nbsp;·&nbsp;  Click to open
        </div>
      )}

      {/* ── Admin settings button ── */}
      {!selectedSlug && (
        <button
          className="admin-fab"
          onClick={() => setIsAdminOpen(true)}
          title="Admin Portal"
        >
          <Settings size={17} />
        </button>
      )}

      {/* ── Bank background + Chat Panel ── */}
      {selectedBank && (
        <>
          <div
            className="bank-bg-overlay"
            style={{
              backgroundImage: `url(/backgrounds/${
                selectedSlug === 'gtbank' ? 'gt.png'
                : selectedSlug === 'fcmb' ? 'fcmb.jpg'
                : `${selectedSlug}.png`
              })`
            }}
          />
          
          {/* Mobile: Show chat button overlay if chat is closed */}
          {isMobile && !isChatOpen && (
            <div className="mobile-chat-trigger">
              <button
                className="chat-trigger-btn"
                onClick={() => setIsChatOpen(true)}
                style={{ backgroundColor: selectedBank.brandColor }}
              >
                💬 Chat with {selectedBank.name}
              </button>
            </div>
          )}
          
          {/* Chat Panel - hidden on mobile by default, visible on desktop */}
          {(!isMobile || isChatOpen) && (
            <ChatPanel
              bank={selectedBank}
              onClose={() => {
                if (isMobile) {
                  setIsChatOpen(false);
                } else {
                  setSelectedSlug(null);
                }
              }}
            />
          )}
        </>
      )}

      {/* ── Admin Portal ── */}
      <AdminPortal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        bankSlugs={banks.map(b => ({ slug: b.slug, name: b.name }))}
      />
    </div>
  );
}
