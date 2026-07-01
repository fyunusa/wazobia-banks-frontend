import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { StarsBackground } from './components/StarsBackground';
import { BankCarousel3D } from './components/BankCarousel3D';
import type { BankData } from './components/BankCarousel3D';
import { ChatPanel } from './components/ChatPanel';
import { AdminPortal } from './components/AdminPortal';
import { fetchInstitutions } from './services/api';
import { HelpCircle, Sparkles, Settings } from 'lucide-react';

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
  const guideHudRef = useRef<HTMLDivElement>(null);

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

  // Coordinated GSAP Slide Animations for Dashboard elements on selection
  useEffect(() => {
    import('gsap').then(({ gsap }) => {
      if (selectedSlug) {
        // Selected: slide dashboard controls out
        gsap.to(hudHeaderRef.current, { y: -100, opacity: 0, duration: 0.5, ease: 'power3.inOut' });
        gsap.to(dockRef.current, { y: 120, opacity: 0, duration: 0.5, ease: 'power3.inOut' });
        gsap.to(guideHudRef.current, { opacity: 0, duration: 0.3 });
      } else {
        // Deselected: slide dashboard controls in
        gsap.to(hudHeaderRef.current, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
        gsap.to(dockRef.current, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
        gsap.to(guideHudRef.current, { opacity: 1, duration: 0.4 });
      }
    });
  }, [selectedSlug]);

  const selectedBank = banks.find((b) => b.slug === selectedSlug);

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

          {/* Star particles */}
          <StarsBackground />

          {/* 3D Bank Carousel */}
          <BankCarousel3D
            banks={banks}
            selectedSlug={selectedSlug}
            onSelectBank={(slug) => setSelectedSlug(slug)}
            carouselAngle={carouselAngle}
            setCarouselAngle={setCarouselAngle}
          />
        </Canvas>

        {/* Floating guidance overlay */}
        <div ref={guideHudRef} className="guide-hud">
          <HelpCircle className="guide-icon" size={16} />
          <span>DRAG TO ROTATE CAROUSEL • SELECT CARD TO INITIATE CONSOLE</span>
        </div>
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
          background: #030408;
          font-family: var(--font-sans);
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
          background-size: 50px 50px;
          background-position: center;
          pointer-events: none;
          z-index: 1;
        }

        .hud-header {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          max-width: calc(100% - 40px);
          padding: 14px 20px;
          border-radius: 20px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
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
          color: var(--color-accent);
          animation: spin 6s linear infinite;
        }

        .hud-header h1 {
          font-size: 18px;
          margin: 0;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .badge {
          font-size: 9px;
          background: var(--color-primary-glow);
          color: var(--color-primary);
          border: 1px solid var(--border-glow);
          padding: 2px 6px;
          border-radius: 9999px;
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .admin-portal-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          transition: all 0.2s;
        }

        .admin-portal-btn:hover {
          color: #fff;
          background: var(--color-primary-glow);
          border-color: rgba(99, 102, 241, 0.3);
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
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(10, 12, 22, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 8px 18px;
          border-radius: 9999px;
          font-size: 10px;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }

        .guide-icon {
          color: var(--color-primary);
          animation: pulse-ring 2s infinite;
        }

        /* Bottom dock layout replacing left sidebar */
        .bottom-dock {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 85%;
          max-width: 900px;
          border-radius: 24px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
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
          gap: 10px;
          overflow-x: auto;
          width: 100%;
          padding-bottom: 4px;
          justify-content: flex-start;
        }
        
        /* Hide scrollbars for chrome/safari */
        .dock-items-wrapper::-webkit-scrollbar {
          display: none;
        }

        .dock-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .dock-item:hover {
          transform: scale(1.08) translateY(-1px);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .dock-item.active {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.35);
          color: #fff;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
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
