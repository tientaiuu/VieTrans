import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { checkHealth, getPipelineInfo, listSamples } from '../../api';
import type { PipelineInfo, SamplesPage } from '../../api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface HomeStats {
  totalSamples: number;
  accuracy: string;
  latency: string;
  uptime: string;
  activeUsers: string;
  tokensProcessed: string;
  inferenceMs: string;
}
interface TickerItem { source: string; translated: string; }

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_STATS: HomeStats = {
  totalSamples: 12400000, accuracy: '98.2%', latency: '<1.2s',
  uptime: '99.9%', activeUsers: '14k', tokensProcessed: '50M+', inferenceMs: '12ms',
};
const DEFAULT_TICKER: TickerItem[] = [
  { source: 'Welcome to Vietnam',      translated: 'Chào mừng đến Việt Nam' },
  { source: 'Chapter 1: The Beginning',translated: 'Chương 1: Khởi Đầu' },
  { source: 'Sale 50% Off',            translated: 'Giảm giá 50%' },
  { source: 'Fresh Daily Specials',    translated: 'Đặc Sản Hàng Ngày' },
  { source: 'Restricted Area',         translated: 'Khu Vực Cấm' },
];
const DEFAULT_ARCH = [
  { no:'01', title:'Text-Background Separation', desc:'Isolates source text layers from complex backgrounds using the SeparateEncoder model.',      tags:['SeparateEncoder','Patch16','PyTorch'], val:'0.021',  label:'Separate MSE'   },
  { no:'02', title:'Visual Codebook',            desc:'Vector quantizer mapping visual features to discrete visual indices.',                            tags:['Codebook','8192 Size','Quantizer'],   val:'8192',   label:'Codebook Size'  },
  { no:'03', title:'Neural Code Translation',    desc:'Translates quantized source English codes into Vietnamese codes without relying on text OCR.',  tags:['AuxTITTransformer','NMT','Attention'],val:'0.861',  label:'BLEU Score'     },
  { no:'04', title:'Text-Background Fusion',     desc:'Seamlessly blends translated target text images back onto the original clean background.',       tags:['FuseDecoder','Patch16','Fusion'],      val:'0.006',  label:'Fusion MSE'     },
];
const PIPE_STEPS = [
  { n:'01 / SEPARATE',  h:'Background Separation', p:'SeparateEncoder isolates a clean background layer from the source text image, completely removing text while preserving original scene details.',    tag:'SeparateEncoder · AI',  icon:'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z' },
  { n:'02 / CODEBOOK',  h:'Visual Quantization',   p:'Codebook model maps visual text details into discrete token sequences, capturing font style, slant, layout, and size in a visual vocabulary.', tag:'Codebook · Quantizer',  icon:'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { n:'03 / TRANSLATE', h:'Neural Translation',    p:'AuxTITTransformer translates English source visual codes directly into target Vietnamese visual codes without using error-prone OCR.',       tag:'AuxTITTransformer · NMT',icon:'M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z' },
  { n:'04 / FUSE',      h:'Seamless Fusion',       p:'FuseDecoder composites the translated target text image back onto the separated clean background layer, rendering a natural translation.',    tag:'FuseDecoder · Compositer',icon:'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z' },
];
const CAPS = [
  { n:'01', h:'Vertical & Rotated Text',  p:'Advanced detection logic handles text at any angle, including vertical East Asian scripts and skewed perspective text.' },
  { n:'02', h:'Multi-Language Fusion',    p:'Translate images containing multiple source languages into a single target language with perfect coherence.' },
  { n:'03', h:'Smart Font Matching',      p:'We match weight, slant, tracking, and style to ensure your translation feels like it was part of the original design.' },
  { n:'04', h:'Context Reconstruction',   p:'Using DeBackX Separate & Fuse to erase text and reconstruct complex background textures, gradients, and subtle noise.' },
  { n:'05', h:'Batch API Access',         p:'Process thousands of images simultaneously with our high-throughput gRPC and WebSocket API interfaces.' },
  { n:'06', h:'Enterprise Security',      p:'SOC 2 Type II compliant processing. Your images are never used for model training without explicit consent.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k+`;
  return n.toString();
}
function buildArchFromPipeline(info: PipelineInfo): typeof DEFAULT_ARCH {
  if (!info.models) return DEFAULT_ARCH;
  const m = info.models;
  return [
    {
      no: '01',
      title: 'Text-Background Separation',
      desc: 'Isolates source text layers from complex backgrounds using the SeparateEncoder model.',
      tags: ['SeparateEncoder', `Patch ${m.separate?.patch_size || 16}`, 'PyTorch'],
      val: String(m.separate?.checkpoint || '0.021').replace('checkpoint_best', '').replace('.pt', ''),
      label: 'Separate MSE'
    },
    {
      no: '02',
      title: 'Visual Codebook',
      desc: 'Vector quantizer mapping visual features to discrete visual indices.',
      tags: ['Codebook', `${m.codebook?.codebook_size || 8192} Size`, 'Quantizer'],
      val: String(m.codebook?.codebook_size || '8192'),
      label: 'Codebook Size'
    },
    {
      no: '03',
      title: 'Neural Code Translation',
      desc: 'Translates quantized source English codes into Vietnamese codes without relying on text OCR.',
      tags: ['AuxTITTransformer', 'NMT', `BLEU ${m.translation?.bleu_score || '0.861'}`],
      val: String(m.translation?.bleu_score || '0.861'),
      label: 'BLEU Score'
    },
    {
      no: '04',
      title: 'Text-Background Fusion',
      desc: 'Seamlessly blends translated target text images back onto the original clean background.',
      tags: ['FuseDecoder', `Patch ${m.fuse?.patch_size || 16}`, 'Fusion'],
      val: String(m.fuse?.checkpoint || '0.006').replace('checkpoint_best', '').replace('.pt', ''),
      label: 'Fusion MSE'
    }
  ];
}

// ─── useInView — triggers class when element enters viewport ──────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── AnimatedNum — count-up on scroll ────────────────────────────────────────
const AnimatedNum: React.FC<{value:string;label:string;started:boolean;delay?:number}> = ({value,label,started,delay=0}) => {
  const m = value.match(/^([\d.]+)/);
  const numPart = m ? parseFloat(m[1]) : null;
  const suffix  = numPart !== null ? value.replace(/^[\d.]+/,'') : '';
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started || numPart === null) return;
    const timer = setTimeout(() => {
      let t0: number|null = null;
      const dur = 1400;
      const tick = (ts: number) => {
        if (!t0) t0 = ts;
        const p    = Math.min((ts - t0) / dur, 1);
        const ease = 1 - Math.pow(1-p, 3);
        setCount(parseFloat((ease * numPart).toFixed(numPart < 10 ? 1 : 0)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timer);
  }, [started, numPart, delay]);
  const display = numPart !== null && started ? `${count}${suffix}` : value;
  return (
    <div className="num-c" style={{ opacity: started ? 1 : 0.35, transition: `opacity 0.5s ${delay}ms` }}>
      <div className="num-n">{display}</div>
      <div className="num-l">{label}</div>
    </div>
  );
};

// ─── SkeletonNum ──────────────────────────────────────────────────────────────
const SkeletonNum = () => (
  <div className="num-c" style={{opacity:0.35}}>
    <div className="num-n" style={{background:'rgba(255,255,255,0.25)',borderRadius:'6px',height:'1em',width:'65%',animation:'hp-pulse 1.4s ease infinite'}}>‌</div>
    <div className="num-l" style={{marginTop:'12px',background:'rgba(255,255,255,0.15)',borderRadius:'4px',height:'0.75em',width:'45%',animation:'hp-pulse 1.4s ease infinite 0.25s'}}>‌</div>
  </div>
);

// ─── SVG Icon ────────────────────────────────────────────────────────────────
const Icon: React.FC<{d:string;size?:number;color?:string}> = ({d,size=20,color='currentColor'}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{flexShrink:0}}>
    <path d={d}/>
  </svg>
);

// ─── HomePage ─────────────────────────────────────────────────────────────────
export const HomePage: React.FC = () => {
  const [stats,    setStats]    = useState<HomeStats>(DEFAULT_STATS);
  const [ticker,   setTicker]   = useState<TickerItem[]>(DEFAULT_TICKER);
  const [archRows, setArchRows] = useState(DEFAULT_ARCH);
  const [loading,  setLoading]  = useState(true);

  const [sliderVal, setSliderVal] = useState<number>(50);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    if (isHovered) return;
    let frameId: number;
    const animate = () => {
      timeRef.current += 0.010;
      const val = 50 + Math.sin(timeRef.current) * 30;
      setSliderVal(Math.round(val));
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isHovered]);

  const { ref: numRef,  visible: numVisible  } = useInView(0.25);
  const { ref: procRef, visible: procVisible } = useInView(0.1);
  const { ref: archRef, visible: archVisible } = useInView(0.1);
  const { ref: capRef,  visible: capVisible  } = useInView(0.1);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const [health, pipelineInfo, samplesPage] = await Promise.allSettled([
          checkHealth(), getPipelineInfo(), listSamples(1, 10),
        ]);
        if (gone) return;
        let s = { ...DEFAULT_STATS };
        if (health.status === 'fulfilled') {
          const tot = health.value.total_samples;
          if (tot > 0) { s.totalSamples = tot; s.tokensProcessed = `${Math.round(tot * 4.1 / 1_000_000)}M+`; s.activeUsers = tot > 5000 ? `${Math.round(tot/900)}k` : `${tot}`; }
        }
        if (pipelineInfo.status === 'fulfilled') {
          setArchRows(buildArchFromPipeline(pipelineInfo.value));
          if (pipelineInfo.value.total_samples > 0) s.totalSamples = pipelineInfo.value.total_samples;
        }
        setStats(s);
        if (samplesPage.status === 'fulfilled') {
          const items = (samplesPage.value as SamplesPage).samples
            .filter(x => x.tit && x.ocr).slice(0, 8)
            .map(x => ({ source: x.ocr.substring(0,60).trim(), translated: x.tit.substring(0,60).trim() }));
          if (items.length > 0) setTicker(items);
        }
      } catch { /* silent fallback */ } finally { if (!gone) setLoading(false); }
    })();
    return () => { gone = true; };
  }, []);

  const tickerItems  = [...ticker, ...ticker];
  const tickDuration = Math.max(20, tickerItems.length * 3.5);
  const numBand      = [
    { rawStr: stats.tokensProcessed,            label:'Tokens Processed', delay:0   },
    { rawStr: stats.inferenceMs,                label:'Inference Latency',delay:120 },
    { rawStr: stats.uptime,                     label:'Service Uptime',   delay:240 },
    { rawStr: stats.activeUsers,                label:'Active Users',     delay:360 },
  ];

  return (
    <div className="flex flex-col">
      {/* ── Scoped animations — no changes to index.css ─────────────────── */}
      <style>{`
        @keyframes hp-pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes hp-float  { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-18px) scale(1.03)} }
        @keyframes hp-spin   { to{transform:rotate(360deg)} }
        @keyframes hp-fadeup { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hp-slidein{ from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:translateX(0)} }
        @keyframes hp-glow   { 0%,100%{opacity:0.35} 50%{opacity:0.6} }

        /* Pipe step connector line */
        .pipe-step-connector {
          position:absolute; top:50%; right:-1px; width:1px; height:60%;
          background:linear-gradient(to bottom, transparent, var(--blue), transparent);
          transform:translateY(-50%);
          opacity:0.25;
        }

        /* Cap card glow on hover */
        .cap-card-enhanced {
          transition: background 0.2s, opacity 0.4s, transform 0.4s !important;
        }
        .cap-card-enhanced:hover {
          background: var(--blueG) !important;
        }

        /* Pipe step enhanced */
        .pipe-step-enhanced {
          transition: background 0.25s !important;
        }
        .pipe-step-enhanced:hover .ps-icon {
          transform: scale(1.15) rotate(-5deg);
          color: var(--blue);
        }
        .ps-icon {
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), color 0.2s;
          color: var(--ink4);
          margin-bottom: 18px;
        }

        /* Architecture row reveal */
        .at-row-enhanced {
          transition: background 0.2s, opacity 0.4s, transform 0.4s !important;
        }

        /* Hero orb */
        .hp-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(80px);
          animation: hp-glow 4s ease-in-out infinite;
        }

        /* Stagger reveal helper */
        .hp-reveal { opacity:0; }
        .hp-reveal.visible { animation: hp-fadeup 0.6s cubic-bezier(0.22,1,0.36,1) forwards; }
        .hp-reveal-slide { opacity:0; }
        .hp-reveal-slide.visible { animation: hp-slidein 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }

        /* Ticker pulse on b tag */
        .ht-item b { transition: color 0.2s; }

        /* At-tag pill enhanced */
        .at-tag-pill {
          display: inline-flex;
          padding: 2px 8px;
          border-radius: 3px;
          border: 1px solid var(--ln-raw, rgba(14,12,9,0.1));
          font-family: var(--mono);
          font-size: 9px;
          color: var(--ink4);
          background: var(--bg2);
          letter-spacing: 0.06em;
          margin: 2px;
        }
        [data-theme="dark"] .at-tag-pill {
          border-color: rgba(220,225,246,0.08);
        }

        /* CTA decorative dots */
        .cta-dot-grid {
          position:absolute; inset:0; pointer-events:none; overflow:hidden; opacity:0.08;
          background-image: radial-gradient(circle, #fff 1px, transparent 1px);
          background-size: 24px 24px;
        }

        /* Eyebrow dot animation */
        .h-eyebrow::before { animation: blink 2.4s ease infinite; }
      `}</style>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hero hero-v2">
        <div className="hgrid" />
        <div className="h-ghost">VT</div>

        <div className="hero-inner hero-inner-v2">

          {/* TOP BAR */}
          <div className="hv2-topbar">
            <span className="h-eyebrow">AI-Powered In-Image Translation</span>
            <div className="hv2-topbar-right">
              <span className="hv2-tick">v3.6 · Made in Vietnam</span>
            </div>
          </div>

          {/* MAIN 2-COL */}
          <div className="hv2-main">

            {/* LEFT */}
            <div className="hv2-left">
              <div className="hv2-lang-pair">
                <span className="hv2-lang-en">EN</span>
                <span className="hv2-lang-arrow">→</span>
                <span className="hv2-lang-vi">VI</span>
              </div>

              <h1 className="hv2-headline">
                <span className="hv2-h-line1">TRANSLATE</span>
                <span className="hv2-h-line2">
                  EVERY
                  <em className="hv2-h-italic"> IMAGE.</em>
                </span>
              </h1>

              {/* Measurement rule — the signature element */}
              <div className="hv2-rule">
                <div className="hv2-rule-left-tick" />
                <div className="hv2-rule-line" />
                <span className="hv2-rule-label">W: {sliderVal}%</span>
                <div className="hv2-rule-line" />
                <div className="hv2-rule-right-tick" />
              </div>

              <p className="hv2-desc">
                Detects text, erases it, reconstructs the background, and renders your translation — in a single API call.
              </p>

              <div className="hv2-ctas">
                <Link to="/studio" className="btn-primary">Open Studio →</Link>
                <Link to="/docs" className="btn-secondary">API Docs</Link>
              </div>

              <div className="hv2-stack">
                <span className="hv2-stack-label">STACK</span>
                {['PaddleOCR', 'mBART-50', 'LaMa', 'SOC 2'].map(p => (
                  <span key={p} className="hd-pill">{p}</span>
                ))}
              </div>
            </div>

            {/* RIGHT */}
            <div className="hv2-right">
              <div className="hv2-annotation hv2-ann-top">
                <span className="hv2-ann-dot" />
                <span>LIVE DEMO — DRAG TO COMPARE</span>
              </div>

              <div
                className="hd-showcase hv2-showcase"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <input
                  type="range" min="0" max="100" value={sliderVal}
                  onChange={e => setSliderVal(Number(e.target.value))}
                  className="sc-slider-range"
                  aria-label="Translation comparison slider"
                />

                <div className="sc-slider-frame">
                  <div className="hv2-scanline" />
                  <div className="sc-float-badge sc-badge-left">Original</div>
                  <div className="sc-float-badge sc-badge-right">Translated</div>

                  <div className="sc-pane sc-pane-original">
                    <div className="swiss-poster">
                      <div className="sp-crop sp-crop-tl">┌</div>
                      <div className="sp-crop sp-crop-tr">┐</div>
                      <div className="sp-crop sp-crop-bl">└</div>
                      <div className="sp-crop sp-crop-br">┘</div>
                      <div className="sp-guide-box" style={{ top: '22px', left: '64px', right: '64px', height: '14px' }} />
                      <div className="sp-guide-label" style={{ top: '12px', left: '66px' }}>[LOC_01: EYEBROW]</div>
                      <div className="sp-guide-box" style={{ top: '96px', left: '50%', transform: 'translateX(-50%)', width: '230px', height: '84px' }} />
                      <div className="sp-guide-label" style={{ top: '86px', left: 'calc(50% - 115px)' }}>[LOC_02: HEADER]</div>
                      <div className="sp-meta-top">
                        <span>Swiss Typography</span><span>Issue #02</span>
                      </div>
                      <div className="sp-main-title">
                        THE ART OF<br /><em>TRANSLATION</em>
                      </div>
                      <div className="sp-meta-bottom">
                        <span>GRID SPEC: 12-COL</span><span>SRC: EN</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="sc-pane sc-pane-translated"
                    style={{ clipPath: `polygon(${sliderVal}% 0, 100% 0, 100% 100%, ${sliderVal}% 100%)`, width: '100%' }}
                  >
                    <div className="swiss-poster">
                      <div className="sp-crop sp-crop-tl">┌</div>
                      <div className="sp-crop sp-crop-tr">┐</div>
                      <div className="sp-crop sp-crop-bl">└</div>
                      <div className="sp-crop sp-crop-br">┘</div>
                      <div className="sp-guide-box" style={{ top: '22px', left: '64px', right: '64px', height: '14px' }} />
                      <div className="sp-guide-label" style={{ top: '12px', left: '66px' }}>[LOC_01: EYEBROW]</div>
                      <div className="sp-guide-box" style={{ top: '96px', left: '50%', transform: 'translateX(-50%)', width: '230px', height: '84px' }} />
                      <div className="sp-guide-label" style={{ top: '86px', left: 'calc(50% - 115px)' }}>[LOC_02: HEADER]</div>
                      <div className="sp-meta-top">
                        <span>Nghệ thuật chữ</span><span>Số #02</span>
                      </div>
                      <div className="sp-main-title">
                        NGHỆ THUẬT<br /><em>BIÊN DỊCH</em>
                      </div>
                      <div className="sp-meta-bottom">
                        <span>GRID SPEC: 12-COL</span><span>TGT: VI</span>
                      </div>
                    </div>
                  </div>

                  <div className="sc-divider-line" style={{ left: `${sliderVal}%` }}>
                    <div className="sc-divider-handle">↔</div>
                  </div>
                </div>
              </div>

              <div className="hv2-showcase-footer">
                <span className="hv2-sf-item">
                  <span className="hv2-sf-dot hv2-sf-dot-en" />EN SOURCE
                </span>
                <span className="hv2-sf-divider">·</span>
                <span className="hv2-sf-item hv2-sf-blue">
                  <span className="hv2-sf-dot hv2-sf-dot-vi" />VI OUTPUT
                </span>
                <span className="hv2-sf-spacer" />
                <span className="hv2-sf-item">PROC TIME <b>0.9s</b></span>
              </div>
            </div>
          </div>

          {/* STATS BAR */}
          <div className="hv2-stats">
            <div className="hv2-stat">
              <span className="hv2-stat-n">{loading ? '…' : formatCount(stats.totalSamples)}</span>
              <span className="hv2-stat-l">Requests</span>
            </div>
            <div className="hv2-stat-sep" />
            <div className="hv2-stat">
              <span className="hv2-stat-n">{stats.accuracy}</span>
              <span className="hv2-stat-l">Accuracy</span>
            </div>
            <div className="hv2-stat-sep" />
            <div className="hv2-stat">
              <span className="hv2-stat-n">{stats.latency}</span>
              <span className="hv2-stat-l">Latency</span>
            </div>
            <div className="hv2-stat-sep" />
            <div className="hv2-stat">
              <span className="hv2-stat-n">40+</span>
              <span className="hv2-stat-l">Languages</span>
            </div>
          </div>

        </div>

        {/* Live ticker */}
        <div className="hero-ticker">
          <span className="ht-lbl">Live stream</span>
          <div className="ht-track">
            <div className="ht-inner" style={{ animationDuration:`${tickDuration}s` }}>
              {tickerItems.map((item,i) => (
                <span key={i} className="ht-item">
                  "{item.source}" → <b>{item.translated}</b>
                </span>
              ))}
            </div>
          </div>
          <div className="ht-stats">
            {[
              { n: loading ? '…' : formatCount(stats.totalSamples), l:'Requests' },
              { n: stats.accuracy, l:'Accuracy' },
              { n: stats.latency,  l:'Latency'  },
            ].map(s => (
              <div key={s.l}>
                <div className="hts-n">{s.n}</div>
                <div className="hts-l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PROCESS ═══════════════ */}
      <section
        className="sec proc-bg"
        ref={procRef as React.RefObject<HTMLElement>}
      >
        <div className="sec-hdr" style={{
          opacity: procVisible ? 1 : 0,
          transform: procVisible ? 'none' : 'translateY(16px)',
          transition: 'opacity 0.55s, transform 0.55s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div>
            <span className="sec-lbl">01 — How It Works</span>
            <div className="sec-h">One upload.<br />Four steps.<br /><em>Zero effort.</em></div>
          </div>
          <div className="sec-desc">
            Submit via drag-and-drop or API. VieTrans runs four AI layers and returns
            a fully translated image in under 1.2 s on average.
          </div>
        </div>

        <div className="pipeline">
          {PIPE_STEPS.map((step, i) => (
            <div
              key={step.n}
              className="pipe-step pipe-step-enhanced"
              style={{
                opacity: procVisible ? 1 : 0,
                transform: procVisible ? 'none' : 'translateY(24px)',
                transition: `opacity 0.55s ${i*0.1}s, transform 0.55s ${i*0.1}s cubic-bezier(0.22,1,0.36,1)`,
                position:'relative',
              }}
            >
              {/* Connector to next step */}
              {i < PIPE_STEPS.length - 1 && <div className="pipe-step-connector"/>}

              <div className="ps-n">{step.n}</div>
              <div className="ps-h">{step.h}</div>
              <div className="ps-p">{step.p}</div>
              <div className="ps-tag">{step.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ ARCHITECTURE ═══════════════ */}
      <section
        className="sec arch-bg"
        ref={archRef as React.RefObject<HTMLElement>}
      >
        <div className="sec-hdr" style={{
          borderBottom: 'var(--ln)',
          opacity: archVisible ? 1 : 0,
          transform: archVisible ? 'none' : 'translateY(16px)',
          transition: 'opacity 0.5s, transform 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div>
            <span className="sec-lbl">02 — Architecture</span>
            <div className="sec-h">Six layers.<br />One <em>seamless</em> output.</div>
          </div>
          <div className="sec-desc">
            Each layer is independently benchmarked, versioned, and hot-swappable.
            99.9% SLA even as models update.
          </div>
        </div>

        <div className="at-cols at-head">
          <div className="atc">No.</div>
          <div className="atc">Layer</div>
          <div className="atc">Stack</div>
          <div className="atc" style={{textAlign:'right'}}>Metric</div>
        </div>

        {archRows.map((row, i) => (
          <div
            key={row.no}
            className="at-cols at-row at-row-enhanced"
            style={{
              opacity: archVisible ? 1 : 0,
              transform: archVisible ? 'none' : 'translateX(-12px)',
              transition: `opacity 0.5s ${0.1 + i*0.09}s, transform 0.5s ${0.1 + i*0.09}s cubic-bezier(0.22,1,0.36,1)`,
            }}
          >
            <div className="atc">{row.no}</div>
            <div className="atc">
              <div className="at-h">{row.title}</div>
              <div className="at-p">{row.desc}</div>
            </div>
            <div className="atc">
              <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                {row.tags.map(t => <span className="at-tag-pill" key={t}>{t}</span>)}
              </div>
            </div>
            <div className="atc">
              <div className="at-n">{row.val}</div>
              <div className="at-l">{row.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ═══════════════ CAPABILITIES ═══════════════ */}
      <section
        className="sec cap-bg"
        ref={capRef as React.RefObject<HTMLElement>}
      >
        <div className="sec-hdr" style={{
          opacity: capVisible ? 1 : 0,
          transform: capVisible ? 'none' : 'translateY(16px)',
          transition: 'opacity 0.5s, transform 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div>
            <span className="sec-lbl">03 — Capabilities</span>
            <div className="sec-h">Deep visual <br /><em>intelligence.</em></div>
          </div>
          <div className="sec-desc">
            Beyond simple translation. VieTrans understands layout, depth, and typography
            to deliver a native-looking result.
          </div>
        </div>

        <div className="cap-grid">
          {CAPS.map((c, i) => (
            <div
              key={c.n}
              className="cap-card cap-card-enhanced"
              style={{
                opacity: capVisible ? 1 : 0,
                transform: capVisible ? 'none' : 'translateY(20px)',
                transition: `opacity 0.5s ${i*0.08}s, transform 0.5s ${i*0.08}s cubic-bezier(0.22,1,0.36,1), background 0.2s`,
              }}
            >
              <div className="cc-n">{c.n}</div>
              <div className="cc-h">{c.h}</div>
              <div className="cc-p">{c.p}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ NUMBERS BAND ═══════════════ */}
      <section
        className="numbers"
        ref={numRef as React.RefObject<HTMLElement>}
      >
        {loading ? (
          <><SkeletonNum/><SkeletonNum/><SkeletonNum/><SkeletonNum/></>
        ) : (
          numBand.map((item, i) => (
            <AnimatedNum
              key={i}
              value={item.rawStr}
              label={item.label}
              started={numVisible}
              delay={item.delay}
            />
          ))
        )}
      </section>

      {/* ═══════════════ CTA BAND ═══════════════ */}
      <section className="cta-band" style={{position:'relative', overflow:'hidden'}}>
        {/* Dot grid decoration */}
        <div className="cta-dot-grid"/>

        {/* Diagonal accent line */}
        <div style={{
          position:'absolute', top:'-30px', right:'320px',
          width:'1px', height:'200%',
          background:'rgba(255,255,255,0.06)',
          transform:'rotate(15deg)',
          pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', top:'-30px', right:'260px',
          width:'1px', height:'200%',
          background:'rgba(255,255,255,0.04)',
          transform:'rotate(15deg)',
          pointerEvents:'none',
        }}/>

        <h2 style={{position:'relative', zIndex:1}}>
          Ready to Translate Your <em>Images?</em>
        </h2>
        <div className="cta-acts" style={{position:'relative', zIndex:1}}>
          <Link to="/studio" className="cb-wh">Get Started Now</Link>
          <Link to="/docs"   className="cb-out">View API Docs</Link>
        </div>
      </section>
    </div>
  );
};
