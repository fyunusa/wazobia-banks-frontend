import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { StarsBackground } from './components/StarsBackground';
import { BankCarousel3D } from './components/BankCarousel3D';
import type { BankData } from './components/BankCarousel3D';
import { ChatPanel } from './components/ChatPanel';
import { AdminPortal } from './components/AdminPortal';
import { fetchInstitutions } from './services/api';
import { HelpCircle, ChevronRight, Landmark, Settings } from 'lucide-react';

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
  },
  {
    slug: 'jaiz',
    name: 'Jaiz Bank',
    full_name: 'Jaiz Bank PLC',
    brandColor: '#006633',
    ussd: '*389*301#',
    license: 'Non-Interest Bank'
  },
  {
    slug: 'eco',
    name: 'Eco Bank',
    full_name: 'Ecobank Nigeria',
    brandColor: '#005b82',
    ussd: '*326#',
    license: 'Commercial Bank'
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

      {/* Dynamic Holographic Bank Background Image */}
      {selectedSlug && (
        <div 
          className="dynamic-bg-overlay"
          style={{
            backgroundImage: `url(/backgrounds/${selectedSlug === 'gtbank' ? 'gt.png' : selectedSlug === 'fcmb' ? 'fcmb.jpg' : `${selectedSlug}.png`})`
          }}
        />
      )}

      {/* Global Header HUD */}
      <header className={`hud-header ${selectedBank ? 'themed-white' : 'glass'}`}>
        <div className="header-top-row">
          <div className="header-logo">
            <Landmark className="logo-spark" style={{ color: selectedBank ? selectedBank.brandColor : undefined }} />
            <h1 className={selectedBank ? 'themed-text-title' : 'text-gradient'}>WAZOBIA BANKS</h1>
          </div>
          
          <button 
            className={`admin-portal-btn ${selectedBank ? 'themed-btn' : 'glass-interactive'}`}
            style={{
              borderColor: selectedBank ? `${selectedBank.brandColor}33` : undefined
            }}
            onClick={() => setIsAdminOpen(true)}
          >
            <Settings size={13} className="settings-icon" />
            <span>Admin Portal</span>
          </button>
        </div>
        <p className="subtitle" style={{ color: selectedBank ? '#64748b' : undefined }}>
          Nigeria's Interactive 3D Multilingual Banking Assistant
        </p>
      </header>

      {/* Left Sidebar List Navigation */}
      <aside className={`sidebar ${selectedBank ? 'themed-white' : 'glass'}`}>
        <div 
          className="sidebar-title"
          style={{
            backgroundColor: selectedBank ? selectedBank.brandColor : undefined,
            borderBottom: selectedBank ? `1px solid rgba(0, 0, 0, 0.05)` : undefined
          }}
        >
          <h2 style={{ color: selectedBank ? '#fff' : undefined }}>INSTITUTIONS</h2>
          <span 
            className="count-label"
            style={{ color: selectedBank ? 'rgba(255, 255, 255, 0.8)' : undefined }}
          >
            {banks.length} active
          </span>
        </div>
        <div className="sidebar-list">
          {banks.map((b) => (
            <button
              key={b.slug}
              className={`sidebar-item ${selectedSlug === b.slug ? 'active' : ''} ${selectedBank ? 'themed-item' : 'glass-interactive'}`}
              style={{
                borderLeft: selectedSlug === b.slug ? `3px solid ${b.brandColor}` : undefined,
                backgroundColor: selectedSlug === b.slug ? (selectedBank ? `${b.brandColor}10` : undefined) : undefined,
              }}
              onClick={() => setSelectedSlug(b.slug)}
            >
              <div className="item-meta">
                <span className="dot" style={{ backgroundColor: b.brandColor, boxShadow: `0 0 6px ${b.brandColor}` }} />
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
          <ambientLight intensity={0.9} />
          <pointLight position={[10, 10, 10]} intensity={2.0} />
          <directionalLight position={[-5, 5, 5]} intensity={1.2} />

          {/* Star particles (rendered only when no bank is selected for clean presentation) */}
          {!selectedSlug && <StarsBackground />}

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
          background: #020306;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(99, 102, 241, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          background-position: center;
          pointer-events: none;
          z-index: 1;
        }

        .hud-header {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 340px;
          padding: 14px 20px;
          border-radius: 16px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .hud-header.themed-white {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }

        .themed-text-title {
          font-size: 18px;
          margin: 0;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #0f172a;
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
          animation: spin 8s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .hud-header h1 {
          font-size: 18px;
          margin: 0;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
        }

        .badge {
          font-size: 8px;
          background: var(--color-primary-glow);
          color: var(--color-primary);
          border: 1px solid var(--border-glow);
          padding: 1px 6px;
          border-radius: 9999px;
          font-weight: 700;
          font-family: var(--font-mono);
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.1);
        }

        .admin-portal-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: var(--font-mono);
        }

        .admin-portal-btn.themed-btn {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #334155;
        }

        .admin-portal-btn.themed-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .admin-portal-btn:hover:not(.themed-btn) {
          color: #fff;
          background: var(--color-primary-glow);
          border-color: rgba(99, 102, 241, 0.35);
          box-shadow: var(--shadow-neon);
          transform: translateY(-1px);
        }

        .admin-portal-btn .settings-icon {
          animation: rotate-settings 20s linear infinite;
        }

        @keyframes rotate-settings {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .subtitle {
          font-size: 9px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .sidebar {
          position: absolute;
          left: 20px;
          top: 116px;
          bottom: 20px;
          width: 280px;
          border-radius: 20px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sidebar.themed-white {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .sidebar-title {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(13, 17, 34, 0.4);
        }

        .sidebar-title h2 {
          font-size: 12px;
          color: #fff;
          letter-spacing: 0.08em;
        }

        .count-label {
          font-size: 10px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-weight: 600;
        }

        .sidebar-list {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sidebar-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-radius: 12px;
          text-align: left;
          background: rgba(255, 255, 255, 0.01);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sidebar-item.themed-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .sidebar-item.themed-item:hover {
          background: #f1f5f9;
          transform: translateY(-1px);
        }

        .sidebar-item.themed-item .item-name {
          color: #475569;
        }

        .sidebar-item.themed-item.active .item-name {
          color: #0f172a;
          font-weight: 700;
        }

        .sidebar-item .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }

        .sidebar-item .item-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sidebar-item .item-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: color 0.3s;
        }

        .sidebar-item:hover:not(.themed-item) .item-name {
          color: #fff;
        }

        .sidebar-item.active:not(.themed-item) {
          background: rgba(255, 255, 255, 0.04);
          box-shadow: var(--shadow-neon);
          border-color: rgba(99, 102, 241, 0.2);
        }

        .sidebar-item.active:not(.themed-item) .item-name {
          color: #fff;
          font-weight: 600;
        }

        .sidebar-item .arrow {
          color: var(--text-muted);
          opacity: 0;
          transform: translateX(-4px);
          transition: all 0.3s;
        }

        .sidebar-item.themed-item .arrow {
          color: #cbd5e1;
        }

        .sidebar-item:hover .arrow,
        .sidebar-item.active .arrow {
          opacity: 1;
          transform: translateX(0);
          color: #fff;
        }

        .sidebar-item.themed-item:hover .arrow,
        .sidebar-item.themed-item.active .arrow {
          color: #0f172a;
        }

        .canvas-wrapper {
          width: 100%;
          height: 100%;
          position: absolute;
          inset: 0;
          z-index: 2;
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .canvas-wrapper.shift-left {
          transform: translateX(-160px);
        }

        .dynamic-bg-overlay {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.95; /* clear background as requested */
          transition: opacity 0.8s ease-in-out;
          z-index: 1;
          pointer-events: none;
          animation: fadeInBg 0.8s ease-in-out;
        }

        @keyframes fadeInBg {
          from { opacity: 0; }
          to { opacity: 0.95; }
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
          padding: 8px 18px;
          border-radius: 9999px;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
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
