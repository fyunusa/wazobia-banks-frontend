import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { BankCarousel3D } from './components/BankCarousel3D';
import type { BankData } from './components/BankCarousel3D';
import { ChatPanel } from './components/ChatPanel';
import { AdminPortal } from './components/AdminPortal';
import { fetchInstitutions } from './services/api';
import { Sparkles, Settings } from 'lucide-react';

interface RichBankData extends BankData {
  acronym: string;
}

const FALLBACK_BANKS: RichBankData[] = [
  {
    slug: 'gtbank',
    name: 'GTBank',
    acronym: 'GTB',
    full_name: 'Guaranty Trust Bank',
    brandColor: '#dd4f05',
    ussd: '*737#',
    license: 'Commercial Bank'
  },
  {
    slug: 'zenith',
    name: 'Zenith Bank',
    acronym: 'ZEN',
    full_name: 'Zenith Bank PLC',
    brandColor: '#d30007',
    ussd: '*966#',
    license: 'Commercial Bank'
  },
  {
    slug: 'access',
    name: 'Access Bank',
    acronym: 'ACC',
    full_name: 'Access Bank PLC',
    brandColor: '#00b0ff',
    ussd: '*901#',
    license: 'Commercial Bank'
  },
  {
    slug: 'firstbank',
    name: 'FirstBank',
    acronym: 'FBN',
    full_name: 'First Bank of Nigeria',
    brandColor: '#bf9b30',
    ussd: '*894#',
    license: 'Commercial Bank'
  },
  {
    slug: 'uba',
    name: 'UBA',
    acronym: 'UBA',
    full_name: 'United Bank for Africa',
    brandColor: '#e11d48',
    ussd: '*919#',
    license: 'Commercial Bank'
  },
  {
    slug: 'union',
    name: 'Union Bank',
    acronym: 'UBN',
    full_name: 'Union Bank of Nigeria',
    brandColor: '#009fe3',
    ussd: '*826#',
    license: 'Commercial Bank'
  },
  {
    slug: 'sterling',
    name: 'Sterling Bank',
    acronym: 'STB',
    full_name: 'Sterling Bank PLC',
    brandColor: '#e11d48',
    ussd: '*822#',
    license: 'Commercial Bank'
  },
  {
    slug: 'wema',
    name: 'Wema Bank',
    acronym: 'WMA',
    full_name: 'Wema Bank PLC',
    brandColor: '#8a1538',
    ussd: '*945#',
    license: 'Commercial Bank'
  },
  {
    slug: 'fidelity',
    name: 'Fidelity Bank',
    acronym: 'FID',
    full_name: 'Fidelity Bank PLC',
    brandColor: '#002d62',
    ussd: '*770#',
    license: 'Commercial Bank'
  },
  {
    slug: 'fcmb',
    name: 'FCMB',
    acronym: 'FCM',
    full_name: 'First City Monument Bank',
    brandColor: '#fbbf24',
    ussd: '*329#',
    license: 'Commercial Bank'
  },
  {
    slug: 'stanbic',
    name: 'Stanbic IBTC',
    acronym: 'SIB',
    full_name: 'Stanbic IBTC Bank',
    brandColor: '#0033a0',
    ussd: '*909#',
    license: 'Commercial Bank'
  },
  {
    slug: 'opay',
    name: 'OPay',
    acronym: 'OPY',
    full_name: 'OPay Digital Services',
    brandColor: '#00b074',
    ussd: '*955#',
    license: 'Mobile Money Operator'
  },
  {
    slug: 'kuda',
    name: 'Kuda Bank',
    acronym: 'KUD',
    full_name: 'Kuda Microfinance Bank',
    brandColor: '#40196d',
    ussd: '*894#',
    license: 'Fintech/MFB'
  },
  {
    slug: 'moniepoint',
    name: 'Moniepoint',
    acronym: 'MNP',
    full_name: 'Moniepoint MFB',
    brandColor: '#0052cc',
    ussd: '*5573#',
    license: 'Fintech/MFB'
  },
  {
    slug: 'palmpay',
    name: 'PalmPay',
    acronym: 'PLM',
    full_name: 'PalmPay Limited',
    brandColor: '#7c3aed',
    ussd: '*652#',
    license: 'Mobile Money Operator'
  }
];

function App() {
  const [banks, setBanks] = useState<RichBankData[]>(FALLBACK_BANKS);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [carouselAngle, setCarouselAngle] = useState(0);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // GSAP Animation References
  const hudHeaderRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  // Helper to convert hex to rgb for background theme color transition
  const getBankBgColor = (hex: string) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.22)`;
  };

  // Fetch dynamic active institutions on mount and merge details
  useEffect(() => {
    fetchInstitutions()
      .then((data) => {
        const merged = data.map((dyn) => {
          const local = FALLBACK_BANKS.find(l => l.slug === dyn.slug);
          return {
            slug: dyn.slug,
            name: dyn.name,
            acronym: local?.acronym || dyn.name.substring(0, 3).toUpperCase(),
            full_name: dyn.full_name,
            brandColor: local?.brandColor || '#6366f1',
            ussd: dyn.ussd_code || local?.ussd || '*737#',
            license: dyn.cbn_license_type || local?.license || 'Commercial Bank'
          };
        });
        if (merged.length > 0) {
          setBanks(merged);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch dynamic institutions, using static fallbacks.", err);
      });
  }, []);

  const selectedBank = banks.find((b) => b.slug === selectedSlug);

  // Coordinated GSAP Slide Animations for Dashboard elements on selection
  useEffect(() => {
    import('gsap').then(({ gsap }) => {
      const targetGlow = selectedBank ? getBankBgColor(selectedBank.brandColor) : 'rgba(0,0,0,0)';
      
      if (selectedSlug) {
        // Selected: slide dashboard controls out
        gsap.to(hudHeaderRef.current, { y: -100, opacity: 0, duration: 0.5, ease: 'power3.inOut' });
        gsap.to(dockRef.current, { y: 120, opacity: 0, duration: 0.5, ease: 'power3.inOut' });
      } else {
        // Deselected: slide dashboard controls in
        gsap.to(hudHeaderRef.current, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
        gsap.to(dockRef.current, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
      }

      // Transition the container background to match the selected bank color dynamically
      gsap.to('.dashboard-container', {
        background: selectedSlug 
          ? `radial-gradient(circle at 50% 50%, ${targetGlow} 0%, #0e0f12 90%)`
          : '#0e0f12',
        duration: 0.8,
        ease: 'power2.out'
      });
    });
  }, [selectedSlug, selectedBank]);

  return (
    <div className="dashboard-container">
      {/* Dynamic Cyber Grid Background Overlay */}
      <div className="grid-overlay" />

      {/* Global Header HUD (Slides out on select) */}
      <header ref={hudHeaderRef} className="hud-header glass">
        <div className="header-top-row">
          <div className="header-logo">
            <Sparkles className="logo-spark" />
            <h1 className="text-gradient">WAZOBIA AI</h1>
            <span className="badge">RAG v1.0</span>
          </div>
          
          <button 
            className="admin-portal-btn glass-interactive"
            onClick={() => setIsAdminOpen(true)}
          >
            <Settings size={14} />
            <span>Admin Portal</span>
          </button>
        </div>
        <p className="subtitle">Interactive Multilingual Banking Workspace</p>
      </header>

      {/* Primary 3D Rendering Area */}
      <main className="canvas-wrapper">
        <Canvas
          camera={{ position: [0, 0.4, 4.5], fov: 60 }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.7} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <directionalLight position={[-5, 5, 5]} intensity={0.8} />

          {/* 3D Bank Carousel */}
          <BankCarousel3D
            banks={banks}
            selectedSlug={selectedSlug}
            onSelectBank={(slug) => setSelectedSlug(slug)}
            carouselAngle={carouselAngle}
            setCarouselAngle={setCarouselAngle}
          />
        </Canvas>
      </main>

      {/* Floating Bottom Bank Dock (Horizontal selector dock replacing the left sidebar) */}
      <div ref={dockRef} className="bottom-dock glass">
        <div className="dock-label">SYSTEM CONSOLES</div>
        <div className="dock-items-wrapper">
          {banks.map((b) => (
            <button
              key={b.slug}
              className={`dock-item glass-interactive ${selectedSlug === b.slug ? 'active' : ''}`}
              onClick={() => setSelectedSlug(b.slug)}
            >
              <span className="dock-dot" style={{ backgroundColor: b.brandColor }} />
              <span className="dock-name">{b.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Full-Screen Workspace Panel (overlaid when selection active) */}
      {selectedBank && (
        <ChatPanel
          bank={selectedBank}
          onClose={() => setSelectedSlug(null)}
        />
      )}

      {/* Administrative Knowledge Ingestion Portal Modal */}
      <AdminPortal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        bankSlugs={banks.map(b => ({ slug: b.slug, name: b.name }))}
      />

      {/* CSS Overlay Styles */}
      <style>{`
        .dashboard-container {
          width: 100vw;
          height: 100vh;
          position: relative;
          overflow: hidden;
          background: var(--bg-deep);
          font-family: var(--font-sans);
        }

        .grid-overlay {
          display: none;
        }

        .hud-header {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 520px;
          max-width: calc(100% - 40px);
          padding: 16px 24px;
          border-radius: 12px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: var(--bg-card);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: var(--shadow-premium);
          text-align: center;
        }

        .header-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .header-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-spark {
          color: var(--color-primary);
        }

        .hud-header h1 {
          font-size: 19px;
          margin: 0;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .badge {
          font-size: 9px;
          background: rgba(197, 168, 128, 0.1);
          color: var(--color-primary);
          border: 1px solid rgba(197, 168, 128, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .admin-portal-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          transition: all 0.2s;
        }

        .admin-portal-btn:hover {
          color: #fff;
          background: rgba(197, 168, 128, 0.1);
          border-color: var(--color-primary);
        }

        .subtitle {
          font-size: 10px;
          color: var(--text-secondary);
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .canvas-wrapper {
          width: 100%;
          height: 100%;
          position: absolute;
          inset: 0;
          z-index: 2;
        }

        .guide-hud {
          position: absolute;
          bottom: 124px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-card);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 10px;
          letter-spacing: 0.05em;
          color: var(--color-primary);
          font-family: var(--font-mono);
          box-shadow: var(--shadow-premium);
        }

        .guide-icon {
          color: var(--color-primary);
        }

        /* Bottom dock layout replacing left sidebar */
        .bottom-dock {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 85%;
          max-width: 900px;
          border-radius: 12px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: var(--bg-card);
          box-shadow: var(--shadow-premium);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .dock-label {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 800;
          font-family: var(--font-mono);
        }

        .dock-items-wrapper {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          width: 100%;
          padding-bottom: 4px;
          justify-content: flex-start;
        }
        
        .dock-items-wrapper::-webkit-scrollbar {
          display: none;
        }

        .dock-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .dock-item:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        .dock-item.active {
          background: var(--bg-glass);
          border-color: var(--color-primary);
          color: #fff;
        }

        .dock-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
