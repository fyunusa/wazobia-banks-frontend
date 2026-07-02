import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll } from '@react-three/drei';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollScene } from './components/ScrollScene';
import { ChatPanel } from './components/ChatPanel';
import { AdminPortal } from './components/AdminPortal';
import { fetchInstitutions } from './services/api';
import { Settings } from 'lucide-react';
import type { BankData } from './components/BankSceneGraph';

gsap.registerPlugin(ScrollTrigger);

const FALLBACK_BANKS: BankData[] = [
  { slug: 'gtbank',     name: 'GTBank',       full_name: 'Guaranty Trust Bank',        brandColor: '#dd4f05', ussd: '*737#',    license: 'Commercial Bank' },
  { slug: 'zenith',     name: 'Zenith Bank',  full_name: 'Zenith Bank PLC',            brandColor: '#d30007', ussd: '*966#',    license: 'Commercial Bank' },
  { slug: 'access',     name: 'Access Bank',  full_name: 'Access Bank PLC',            brandColor: '#00b0ff', ussd: '*901#',    license: 'Commercial Bank' },
  { slug: 'firstbank',  name: 'FirstBank',    full_name: 'First Bank of Nigeria',      brandColor: '#bf9b30', ussd: '*894#',    license: 'Commercial Bank' },
  { slug: 'uba',        name: 'UBA',          full_name: 'United Bank for Africa',     brandColor: '#e11d48', ussd: '*919#',    license: 'Commercial Bank' },
  { slug: 'union',      name: 'Union Bank',   full_name: 'Union Bank of Nigeria',      brandColor: '#009fe3', ussd: '*826#',    license: 'Commercial Bank' },
  { slug: 'sterling',   name: 'Sterling Bank',full_name: 'Sterling Bank PLC',          brandColor: '#e11d48', ussd: '*822#',    license: 'Commercial Bank' },
  { slug: 'wema',       name: 'Wema Bank',    full_name: 'Wema Bank PLC',              brandColor: '#8a1538', ussd: '*945#',    license: 'Commercial Bank' },
  { slug: 'fidelity',   name: 'Fidelity Bank',full_name: 'Fidelity Bank PLC',          brandColor: '#002d62', ussd: '*770#',    license: 'Commercial Bank' },
  { slug: 'fcmb',       name: 'FCMB',         full_name: 'First City Monument Bank',   brandColor: '#fbbf24', ussd: '*329#',    license: 'Commercial Bank' },
  { slug: 'stanbic',    name: 'Stanbic IBTC', full_name: 'Stanbic IBTC Bank',          brandColor: '#0033a0', ussd: '*909#',    license: 'Commercial Bank' },
  { slug: 'opay',       name: 'OPay',         full_name: 'OPay Digital Services',      brandColor: '#00b074', ussd: '*955#',    license: 'Mobile Money Operator' },
  { slug: 'kuda',       name: 'Kuda Bank',    full_name: 'Kuda Microfinance Bank',     brandColor: '#40196d', ussd: '*894#',    license: 'Fintech/MFB' },
  { slug: 'moniepoint', name: 'Moniepoint',   full_name: 'Moniepoint MFB',             brandColor: '#0052cc', ussd: '*5573#',   license: 'Fintech/MFB' },
  { slug: 'palmpay',    name: 'PalmPay',      full_name: 'PalmPay Limited',            brandColor: '#7c3aed', ussd: '*652#',    license: 'Mobile Money Operator' },
  { slug: 'jaiz',       name: 'Jaiz Bank',    full_name: 'Jaiz Bank PLC',              brandColor: '#006633', ussd: '*389*301#',license: 'Non-Interest Bank' },
  { slug: 'eco',        name: 'Eco Bank',     full_name: 'Ecobank Nigeria',            brandColor: '#005b82', ussd: '*326#',    license: 'Commercial Bank' },
];

function App() {
  const [banks, setBanks] = useState<BankData[]>(FALLBACK_BANKS);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLDivElement>(null);
  const heroSubRef = useRef<HTMLDivElement>(null);
  const heroArrowRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);

  const selectedBank = banks.find((b) => b.slug === selectedSlug);

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

  // GSAP scroll-driven text animations for HTML overlays
  useGSAP(() => {
    // Hero title — fade in on load
    if (heroTitleRef.current) {
      gsap.from(heroTitleRef.current.querySelectorAll('.gsap-word'), {
        y: 80,
        opacity: 0,
        duration: 1.2,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.3,
      });
    }
    if (heroSubRef.current) {
      gsap.from(heroSubRef.current, {
        y: 20,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
        delay: 0.9,
      });
    }
    if (heroArrowRef.current) {
      gsap.from(heroArrowRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.8,
        delay: 1.5,
      });
      // Continuous bounce
      gsap.to(heroArrowRef.current, {
        y: 10,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });
    }

    // Section 1 text — reveal on scroll
    if (section1Ref.current) {
      gsap.from(section1Ref.current.querySelectorAll('.reveal'), {
        scrollTrigger: {
          trigger: section1Ref.current,
          start: 'top 75%',
          end: 'top 30%',
          scrub: 1,
        },
        y: 60,
        opacity: 0,
        stagger: 0.15,
      });
    }

    // Section 2 stats — counter animation
    if (section2Ref.current) {
      gsap.from(section2Ref.current.querySelectorAll('.stat-pill'), {
        scrollTrigger: {
          trigger: section2Ref.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
        scale: 0.6,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'back.out(1.7)',
      });
    }

    // Section 3 language pills
    if (section3Ref.current) {
      gsap.from(section3Ref.current.querySelectorAll('.lang-pill'), {
        scrollTrigger: {
          trigger: section3Ref.current,
          start: 'top 60%',
          toggleActions: 'play none none reverse',
        },
        scale: 0,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'back.out(2)',
      });
    }

    // Section 4 CTA
    if (section4Ref.current) {
      gsap.from(section4Ref.current.querySelectorAll('.cta-item'), {
        scrollTrigger: {
          trigger: section4Ref.current,
          start: 'top 65%',
          toggleActions: 'play none none reverse',
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
      });
    }
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="app-root">

      {/* ── Full-Screen 3D Canvas ──────────────────────────── */}
      <div className="canvas-fixed">
        <Canvas
          camera={{ position: [0, 0.4, 11], fov: 58 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
          shadows
        >
          {selectedSlug ? (
            // When bank selected: no scroll, just show the selected scene
            <ScrollScene
              banks={banks}
              selectedSlug={selectedSlug}
              onSelectBank={setSelectedSlug}
            />
          ) : (
            <ScrollControls pages={5} damping={0.35} distance={1}>
              <Scroll>
                <ScrollScene
                  banks={banks}
                  selectedSlug={selectedSlug}
                  onSelectBank={setSelectedSlug}
                />
              </Scroll>
            </ScrollControls>
          )}
        </Canvas>
      </div>

      {/* ── Admin settings button ──────────────────────────── */}
      {!selectedSlug && (
        <button
          className="admin-fab"
          onClick={() => setIsAdminOpen(true)}
          title="Admin Portal"
        >
          <Settings size={18} />
        </button>
      )}

      {/* ── HTML Scroll Overlay (only visible when no bank) ── */}
      {!selectedSlug && (
        <div className="scroll-overlay">

          {/* ── Section 0: Hero ─────────────────────────────── */}
          <section className="scroll-section hero-section" style={{ height: '100vh' }}>
            <div className="hero-content">
              <div ref={heroTitleRef} className="hero-title-wrap">
                <h1 className="hero-title">
                  <span className="gsap-word">Nigerian</span>{' '}
                  <span className="gsap-word gradient-text">Banks</span>
                </h1>
                <h2 className="hero-title hero-title--sub">
                  <span className="gsap-word">Your</span>{' '}
                  <span className="gsap-word">Language</span>
                </h2>
              </div>
              <p ref={heroSubRef} className="hero-sub">
                Interact with any Nigerian bank in Hausa, Yoruba, Igbo, Pidgin or English
              </p>
            </div>
            <div ref={heroArrowRef} className="scroll-arrow">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <span>Scroll to explore</span>
            </div>
          </section>

          {/* ── Section 1: Pan Reveal ───────────────────────── */}
          <section ref={section1Ref} className="scroll-section" style={{ height: '100vh' }}>
            <div className="section-content section-content--right">
              <p className="reveal section-eyebrow">Powered by AI</p>
              <h2 className="reveal section-heading">Every bank.<br />One platform.</h2>
              <p className="reveal section-body">
                Ask questions, get account info, and make decisions — 
                all without switching apps or waiting on hold.
              </p>
            </div>
          </section>

          {/* ── Section 2: Grid + Stats ─────────────────────── */}
          <section ref={section2Ref} className="scroll-section" style={{ height: '100vh' }}>
            <div className="section-content section-content--center">
              <h2 className="section-heading">The Numbers</h2>
              <div className="stats-grid">
                <div className="stat-pill">
                  <span className="stat-num">{banks.length}</span>
                  <span className="stat-label">Banks</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-num">5</span>
                  <span className="stat-label">Languages</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-num">24/7</span>
                  <span className="stat-label">Available</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-num">Real-time</span>
                  <span className="stat-label">Voice + Text</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 3: Language Showcase ───────────────── */}
          <section ref={section3Ref} className="scroll-section" style={{ height: '100vh' }}>
            <div className="section-content section-content--left">
              <p className="section-eyebrow">Multilingual AI</p>
              <h2 className="section-heading">Speak your<br />language</h2>
              <div className="lang-pills-wrap">
                {['🇳🇬 Hausa', '🟢 Yoruba', '🔵 Igbo', '🔴 Pidgin', '🇬🇧 English'].map((lang) => (
                  <span key={lang} className="lang-pill">{lang}</span>
                ))}
              </div>
            </div>
          </section>

          {/* ── Section 4: CTA ──────────────────────────────── */}
          <section ref={section4Ref} className="scroll-section cta-section" style={{ height: '100vh' }}>
            <div className="section-content section-content--center">
              <p className="cta-item section-eyebrow">Ready to start?</p>
              <h2 className="cta-item cta-heading">Select a Bank<br />to Begin</h2>
              <p className="cta-item cta-sub">Click any card in the 3D scene above</p>
              <div className="cta-item cta-indicator">
                <div className="cta-dot" />
                <div className="cta-dot" />
                <div className="cta-dot" />
              </div>
            </div>
          </section>

        </div>
      )}

      {/* ── Chat Panel (when bank selected) ──────────────── */}
      {selectedBank && (
        <>
          {/* Bank background overlay */}
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
          <ChatPanel
            bank={selectedBank}
            onClose={() => setSelectedSlug(null)}
          />
        </>
      )}

      {/* ── Admin Portal ──────────────────────────────────── */}
      <AdminPortal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        bankSlugs={banks.map(b => ({ slug: b.slug, name: b.name }))}
      />
    </div>
  );
}

export default App;
