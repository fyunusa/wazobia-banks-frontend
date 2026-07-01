import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { StarsBackground } from './components/StarsBackground';
import { BankCarousel3D } from './components/BankCarousel3D';
import type { BankData } from './components/BankCarousel3D';
import { ChatPanel } from './components/ChatPanel';
import { AdminPortal } from './components/AdminPortal';
import { fetchInstitutions } from './services/api';
import { HelpCircle, ChevronRight, Sparkles, Settings } from 'lucide-react';

const FALLBACK_BANKS: BankData[] = [
  {
    slug: 'gtbank',
    name: 'GTBank',
    full_name: 'Guaranty Trust Bank',
    brandColor: '#dd4f05',
    ussd: '*737#',
    license: 'Commercial Bank'
  },
  {
    slug: 'zenith',
    name: 'Zenith Bank',
    full_name: 'Zenith Bank PLC',
    brandColor: '#d30007',
    ussd: '*966#',
    license: 'Commercial Bank'
  },
  {
    slug: 'access',
    name: 'Access Bank',
    full_name: 'Access Bank PLC',
    brandColor: '#00b0ff',
    ussd: '*901#',
    license: 'Commercial Bank'
  },
  {
    slug: 'firstbank',
    name: 'FirstBank',
    full_name: 'First Bank of Nigeria',
    brandColor: '#bf9b30',
    ussd: '*894#',
    license: 'Commercial Bank'
  },
  {
    slug: 'uba',
    name: 'UBA',
    full_name: 'United Bank for Africa',
    brandColor: '#e11d48',
    ussd: '*919#',
    license: 'Commercial Bank'
  },
  {
    slug: 'union',
    name: 'Union Bank',
    full_name: 'Union Bank of Nigeria',
    brandColor: '#009fe3',
    ussd: '*826#',
    license: 'Commercial Bank'
  },
  {
    slug: 'sterling',
    name: 'Sterling Bank',
    full_name: 'Sterling Bank PLC',
    brandColor: '#e11d48',
    ussd: '*822#',
    license: 'Commercial Bank'
  },
  {
    slug: 'wema',
    name: 'Wema Bank',
    full_name: 'Wema Bank PLC',
    brandColor: '#8a1538',
    ussd: '*945#',
    license: 'Commercial Bank'
  },
  {
    slug: 'fidelity',
    name: 'Fidelity Bank',
    full_name: 'Fidelity Bank PLC',
    brandColor: '#002d62',
    ussd: '*770#',
    license: 'Commercial Bank'
  },
  {
    slug: 'fcmb',
    name: 'FCMB',
    full_name: 'First City Monument Bank',
    brandColor: '#fbbf24',
    ussd: '*329#',
    license: 'Commercial Bank'
  },
  {
    slug: 'stanbic',
    name: 'Stanbic IBTC',
    full_name: 'Stanbic IBTC Bank',
    brandColor: '#0033a0',
    ussd: '*909#',
    license: 'Commercial Bank'
  },
  {
    slug: 'opay',
    name: 'OPay',
    full_name: 'OPay Digital Services',
    brandColor: '#00b074',
    ussd: '*955#',
    license: 'Mobile Money Operator'
  },
  {
    slug: 'kuda',
    name: 'Kuda Bank',
    full_name: 'Kuda Microfinance Bank',
    brandColor: '#40196d',
    ussd: '*894#',
    license: 'Fintech/MFB'
  },
  {
    slug: 'moniepoint',
    name: 'Moniepoint',
    full_name: 'Moniepoint MFB',
    brandColor: '#0052cc',
    ussd: '*5573#',
    license: 'Fintech/MFB'
  },
  {
    slug: 'palmpay',
    name: 'PalmPay',
    full_name: 'PalmPay Limited',
    brandColor: '#7c3aed',
    ussd: '*652#',
    license: 'Mobile Money Operator'
  }
];

function App() {
  const [banks, setBanks] = useState<BankData[]>(FALLBACK_BANKS);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [carouselAngle, setCarouselAngle] = useState(0);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Fetch dynamic active institutions on mount and merge details
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

  return (
    <div className="dashboard-container">
      {/* Dynamic Cyber Grid Background Overlay */}
      <div className="grid-overlay" />

      {/* Global Header HUD */}
      <header className="hud-header glass">
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
        <p className="subtitle">Nigeria's Interactive 3D Multilingual Banking Assistant</p>
      </header>

      {/* Left Sidebar List Navigation */}
      <aside className="sidebar glass">
        <div className="sidebar-title">
          <h2>INSTITUTIONS</h2>
          <span className="count-label">{banks.length} active</span>
        </div>
        <div className="sidebar-list">
          {banks.map((b) => (
            <button
              key={b.slug}
              className={`sidebar-item glass-interactive ${selectedSlug === b.slug ? 'active' : ''}`}
              style={{
                borderLeft: selectedSlug === b.slug ? `4px solid ${b.brandColor}` : undefined
              }}
              onClick={() => setSelectedSlug(b.slug)}
            >
              <div className="item-meta">
                <span className="dot" style={{ backgroundColor: b.brandColor }} />
                <span className="item-name">{b.name}</span>
              </div>
              <ChevronRight size={14} className="arrow" />
            </button>
          ))}
        </div>
      </aside>

      {/* Primary 3D Rendering Area */}
      <main className={`canvas-wrapper ${selectedSlug ? 'shift-left' : ''}`}>
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
        {!selectedSlug && (
          <div className="guide-hud">
            <HelpCircle className="guide-icon" size={16} />
            <span>DRAG SCENE TO SPIN • CLICK A CARD TO CONNECT</span>
          </div>
        )}
      </main>

      {/* Floating Chat Panel (rendered when selection active) */}
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
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          background-position: center;
          pointer-events: none;
          z-index: 1;
        }

        .hud-header {
          position: absolute;
          top: 16px;
          left: 16px;
          width: 320px;
          padding: 12px 18px;
          border-radius: 16px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
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
          gap: 6px;
        }

        .logo-spark {
          color: var(--color-accent);
          animation: spin 6s linear infinite;
        }

        .hud-header h1 {
          font-size: 16px;
          margin: 0;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .badge {
          font-size: 8px;
          background: var(--color-primary-glow);
          color: var(--color-primary);
          border: 1px solid var(--border-glow);
          padding: 1px 4px;
          border-radius: 9999px;
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .admin-portal-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          transition: all 0.2s;
        }

        .admin-portal-btn:hover {
          color: #fff;
          background: var(--color-primary-glow);
          border-color: rgba(99, 102, 241, 0.3);
        }

        .subtitle {
          font-size: 9px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .sidebar {
          position: absolute;
          left: 16px;
          top: 104px;
          bottom: 16px;
          width: 260px;
          border-radius: 20px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        }

        .sidebar-title {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(13, 17, 34, 0.4);
        }

        .sidebar-title h2 {
          font-size: 14px;
          color: #fff;
          letter-spacing: 0.05em;
        }

        .count-label {
          font-size: 10px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .sidebar-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sidebar-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-radius: 12px;
          text-align: left;
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.3s;
        }

        .sidebar-item .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .sidebar-item .item-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sidebar-item .item-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: color 0.3s;
        }

        .sidebar-item:hover .item-name {
          color: #fff;
        }

        .sidebar-item.active {
          background: rgba(255, 255, 255, 0.05);
          box-shadow: var(--shadow-neon);
        }

        .sidebar-item.active .item-name {
          color: #fff;
          font-weight: 600;
        }

        .sidebar-item .arrow {
          color: var(--text-muted);
          opacity: 0;
          transform: translateX(-4px);
          transition: all 0.3s;
        }

        .sidebar-item:hover .arrow,
        .sidebar-item.active .arrow {
          opacity: 1;
          transform: translateX(0);
          color: #fff;
        }

        .canvas-wrapper {
          width: 100%;
          height: 100%;
          position: absolute;
          inset: 0;
          z-index: 2;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .canvas-wrapper.shift-left {
          transform: translateX(-150px);
        }

        .guide-hud {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(10, 12, 22, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 10px;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .guide-icon {
          color: var(--color-primary);
          animation: pulse-ring 2s infinite;
        }
      `}</style>
    </div>
  );
}

export default App;
