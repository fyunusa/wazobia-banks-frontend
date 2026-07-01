import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { StarsBackground } from './components/StarsBackground';
import { BankCarousel3D } from './components/BankCarousel3D';
import type { BankData } from './components/BankCarousel3D';
import { ChatPanel } from './components/ChatPanel';
import { AdminPortal } from './components/AdminPortal';
import { fetchInstitutions } from './services/api';
import { HelpCircle, ChevronRight, Sparkles, Settings } from 'lucide-react';

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

  const getLicenseTypeClass = (license: string) => {
    const l = license.toLowerCase();
    if (l.includes('commercial') || l.includes('merchant')) return 'commercial';
    if (l.includes('fintech') || l.includes('microfinance')) return 'fintech';
    return 'mmo';
  };

  const getLicenseShort = (license: string) => {
    const l = license.toLowerCase();
    if (l.includes('commercial')) return 'COMM';
    if (l.includes('microfinance')) return 'MFB';
    if (l.includes('fintech')) return 'FINTECH';
    if (l.includes('money')) return 'MMO';
    return 'BANK';
  };

  // Convert Hex color to semi-transparent version for background glow
  const getGlowColor = (hex: string) => {
    // Simple hex to rgba conversion
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.12)`;
  };

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
                '--active-brand-color': b.brandColor,
                '--active-brand-color-glow': getGlowColor(b.brandColor),
                borderLeft: selectedSlug === b.slug ? `3px solid ${b.brandColor}` : undefined
              } as React.CSSProperties}
              onClick={() => setSelectedSlug(b.slug)}
            >
              {/* Radial background glow on active */}
              <div className="active-glow" />
              
              {/* Neon line indicator */}
              <div className="sidebar-item-brand-line" style={{ backgroundColor: b.brandColor }} />

              <div className="item-header-row">
                <span className="acronym-badge">{b.acronym}</span>
                <span className={`license-pill ${getLicenseTypeClass(b.license)}`}>
                  {getLicenseShort(b.license)}
                </span>
              </div>

              <div className="item-body">
                <span className="circle-indicator" style={{ backgroundColor: b.brandColor }} />
                <span className="item-title-name">{b.name}</span>
              </div>

              <div className="item-footer-row">
                <span className="ussd-label">{b.ussd}</span>
                <ChevronRight size={12} className="arrow" />
              </div>
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
          width: 280px;
          background: rgba(8, 10, 20, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
        }

        .sidebar-title {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(13, 17, 34, 0.2);
        }

        .sidebar-title h2 {
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-weight: 700;
        }

        .count-label {
          font-size: 10px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .sidebar-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sidebar-item {
          position: relative;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          overflow: hidden;
        }

        .sidebar-item:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .sidebar-item.active {
          background: rgba(13, 17, 34, 0.75);
          border-color: rgba(99, 102, 241, 0.15);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        .sidebar-item-brand-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          opacity: 0.15;
          transition: opacity 0.3s;
        }

        .sidebar-item.active .sidebar-item-brand-line {
          opacity: 1;
        }

        .active-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 100% 50%, var(--active-brand-color-glow) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }

        .sidebar-item.active .active-glow {
          opacity: 1;
        }

        .item-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          z-index: 2;
        }

        .acronym-badge {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
          color: #fff;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .license-pill {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .license-pill.commercial {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.15);
        }

        .license-pill.fintech {
          background: rgba(168, 85, 247, 0.1);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.15);
        }

        .license-pill.mmo {
          background: rgba(16, 185, 129, 0.1);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .item-body {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
          z-index: 2;
        }

        .circle-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          transition: all 0.3s;
        }

        .sidebar-item.active .circle-indicator {
          transform: scale(1.4);
        }

        .item-title-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-secondary);
          transition: color 0.3s;
        }

        .sidebar-item:hover .item-title-name,
        .sidebar-item.active .item-title-name {
          color: #fff;
        }

        .item-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          z-index: 2;
        }

        .ussd-label {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .sidebar-item:hover .ussd-label,
        .sidebar-item.active .ussd-label {
          color: var(--text-secondary);
        }

        .sidebar-item .arrow {
          color: var(--text-muted);
          opacity: 0.3;
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
