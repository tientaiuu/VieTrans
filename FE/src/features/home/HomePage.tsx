import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  // Simple scroll reveal logic port
  useEffect(() => {
    const allReveal = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      allReveal.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -100px 0px', threshold: 0.1 });
      allReveal.forEach(el => observer.observe(el));
    }
  }, []);

  return (
    <div className="flex flex-col gap-12 w-full">
      {/* Hero Section */}
      <section className="min-h-[70vh] flex flex-col justify-center gap-6" style={{
        opacity: 0,
        transform: 'translateY(20px)',
        transition: 'all 0.6s ease-out',
        animation: 'fadeUp 0.8s ease forwards'
      }}>
        <div className="data-label self-start">SYS.ID: E-VIETRANS_V1.0</div>

        <h1 className="text-[4rem] sm:text-[6rem] md:text-[8rem] font-black leading-[0.85] tracking-tighter uppercase break-words w-full">
          In-Image<br />
          <span style={{ color: 'transparent', WebkitTextStroke: '2px var(--color-text)' }}>Machine</span><br />
          Translation
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl font-mono mt-4 text-muted border-l-4 border-accent pl-4">
          A high-performance pipeline architecture designed to automatically extract, isolate, translate, and fuse text directly within complex image structures from English to Vietnamese.
        </p>

        <div className="mt-8">
          <Link to="/translator" className="brutalist-btn brutalist-btn-primary">
            Initialize Pipeline <span className="text-xl">➔</span>
          </Link>
        </div>
      </section>

      {/* Grid Architecture Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="brutalist-block p-6 flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-accent text-black font-bold font-mono px-3 py-1 text-xs border-l-[1.5px] border-b-[1.5px] border-black">PHASE_01</div>
          <h2 className="text-2xl mt-4">Isolation</h2>
          <p className="font-mono text-sm opacity-80 mb-6">
            Segment text masks from complex backgrounds, reconstructing the in-painted background image without typographical artifacts.
          </p>
          <div className="mt-auto border-t-2 border-dashed border-border pt-4 text-xs font-mono opacity-50">
            [MPS_ACCELERATION: ENABLED]
          </div>
          <div className="absolute inset-0 bg-text opacity-0 group-hover:opacity-5 transition-opacity mix-blend-overlay pointer-events-none"></div>
        </div>

        <div className="brutalist-block p-6 flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-accent text-black font-bold font-mono px-3 py-1 text-xs border-l-[1.5px] border-b-[1.5px] border-black">PHASE_02</div>
          <h2 className="text-2xl mt-4">Translation</h2>
          <p className="font-mono text-sm opacity-80 mb-6">
            Leveraging neural machine translation with context-aware codebooks to accurately translate isolated strings from Source (EN) to Target (VI).
          </p>
          <div className="mt-auto border-t-2 border-dashed border-border pt-4 text-xs font-mono opacity-50">
            [IIMT_CODEBOOK_SYNC]
          </div>
          <div className="absolute inset-0 bg-text opacity-0 group-hover:opacity-5 transition-opacity mix-blend-overlay pointer-events-none"></div>
        </div>

        <div className="brutalist-block p-6 flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-accent text-black font-bold font-mono px-3 py-1 text-xs border-l-[1.5px] border-b-[1.5px] border-black">PHASE_03</div>
          <h2 className="text-2xl mt-4">Fusion</h2>
          <p className="font-mono text-sm opacity-80 mb-6">
            Re-synthesizing translated text into the reconstructed background, matching typographic scale, style, and spatial alignment.
          </p>
          <div className="mt-auto border-t-2 border-dashed border-border pt-4 text-xs font-mono opacity-50">
            [ADAPTIVE_RENDER: READY]
          </div>
          <div className="absolute inset-0 bg-text opacity-0 group-hover:opacity-5 transition-opacity mix-blend-overlay pointer-events-none"></div>
        </div>
      </section>

      <style>{`
        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
