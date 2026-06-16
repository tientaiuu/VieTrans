import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { checkHealth, getPipelineInfo } from '../../api';
import type { PipelineInfo } from '../../api';

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
  totalSamples: 0, accuracy: 'TBD', latency: 'TBD',
  uptime: 'Worker', activeUsers: 'HTTP', tokensProcessed: 'TBD', inferenceMs: 'TBD',
};
const DEFAULT_TICKER: TickerItem[] = [
  { source: 'Welcome to Vietnam',      translated: 'Chào mừng đến Việt Nam' },
  { source: 'Chapter 1: The Beginning',translated: 'Chương 1: Khởi Đầu' },
  { source: 'Sale 50% Off',            translated: 'Giảm giá 50%' },
  { source: 'Fresh Daily Specials',    translated: 'Đặc Sản Hàng Ngày' },
  { source: 'Restricted Area',         translated: 'Khu Vực Cấm' },
];
const DEFAULT_ARCH = [
  { no:'01', title:'OCR Worker',          desc:'PaddleOCR PP-OCRv5 detects text regions and recognizes English text in the uploaded image.', tags:['PaddleOCR','PP-OCRv5','EN rec'], val:'TBD', label:'OCR CER' },
  { no:'02', title:'Translation Worker',  desc:'A fine-tuned NLLB 1.3B checkpoint translates recognized English text into Vietnamese.', tags:['NLLB 1.3B','EN-VI','chrF'], val:'TBD', label:'MT chrF' },
  { no:'03', title:'Image Postprocess',   desc:'DebackX creates masks, removes source text, and renders Vietnamese text back into the image.', tags:['OpenCV','Mask','Renderer'], val:'mask', label:'Output' },
  { no:'04', title:'API Gateway',         desc:'VieTrans keeps web/auth/history logic separate from the GPU-heavy DebackX worker.', tags:['FastAPI','HTTP worker','Proxy'], val:'remote', label:'Worker API' },
];
const PIPE_STEPS = [
  { n:'01 / OCR',       h:'Text Detection',        p:'PaddleOCR PP-OCRv5 detects text boxes and reads English text from the uploaded image.', tag:'PaddleOCR · PP-OCRv5', icon:'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z' },
  { n:'02 / TRANSLATE', h:'Neural Translation',    p:'The fine-tuned NLLB 1.3B checkpoint translates OCR text from English into Vietnamese.', tag:'NLLB 1.3B · EN-VI', icon:'M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z' },
  { n:'03 / INPAINT',   h:'Text Removal',          p:'DebackX builds a text mask and removes source text before rendering the Vietnamese output.', tag:'OpenCV · Mask', icon:'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { n:'04 / RENDER',    h:'Adaptive Rendering',    p:'Vietnamese text is drawn back with adaptive sizing, stroke, color, and merged subtitle groups.', tag:'DebackX renderer', icon:'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z' },
];
const CAPS = [
  { n:'01', h:'Real Worker Integration',  p:'Uploads are processed by the deployed DebackX FastAPI worker instead of precomputed demo assets.' },
  { n:'02', h:'EN-VI Focus',              p:'The production path is scoped to English text detection and Vietnamese rendering.' },
  { n:'03', h:'Result Metadata',          p:'Each job keeps OCR text, translation, text boxes, mask URL, and rendered output URL.' },
  { n:'04', h:'Backend Proxy',            p:'The web backend hides the worker host while serving generated images back to the frontend.' },
  { n:'05', h:'Evaluation Ready',         p:'BLEU, chrF, CER, WER, latency, and throughput can be shown after running the final evaluation.' },
  { n:'06', h:'Deployment Friendly',      p:'The frontend and gateway stay light while the heavy model runs as a separate GPU worker.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k+`;
  return n.toString();
}

function metricLabel(info: PipelineInfo, key: string): string {
  const value = info.measured_metrics?.[key];
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return 'TBD';
}

function buildArchFromPipeline(info: PipelineInfo): typeof DEFAULT_ARCH {
  if (!info.models) return DEFAULT_ARCH;
  const m = info.models;
  return [
    {
      no: '01',
      title: 'OCR Worker',
      desc: 'PaddleOCR PP-OCRv5 detects and recognizes English text regions.',
      tags: ['PaddleOCR', String(m.ocr_detection?.name || 'PP-OCRv5'), 'EN rec'],
      val: metricLabel(info, 'ocr_cer'),
      label: 'OCR CER'
    },
    {
      no: '02',
      title: 'Translation Worker',
      desc: 'Fine-tuned NLLB 1.3B handles English to Vietnamese subtitle-style text.',
      tags: ['NLLB 1.3B', String(m.translation?.checkpoint || 'worker checkpoint'), 'EN-VI'],
      val: metricLabel(info, 'mt_chrf'),
      label: 'MT chrF'
    },
    {
      no: '03',
      title: 'Image Postprocess',
      desc: 'OpenCV mask inpainting and adaptive rendering generate the final translated image.',
      tags: ['OpenCV', 'Mask', String(m.renderer?.name || 'Renderer')],
      val: 'mask',
      label: 'Output'
    },
    {
      no: '04',
      title: 'API Gateway',
      desc: 'VieTrans proxies uploads, metadata, and worker output files.',
      tags: ['FastAPI', 'HTTP worker', 'History'],
      val: 'remote',
      label: 'Worker API'
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
  const [ticker]                = useState<TickerItem[]>(DEFAULT_TICKER);
  const [archRows, setArchRows] = useState(DEFAULT_ARCH);
  const [loading,  setLoading]  = useState(true);

  const { ref: numRef,  visible: numVisible  } = useInView(0.25);
  const { ref: procRef, visible: procVisible } = useInView(0.1);
  const { ref: archRef, visible: archVisible } = useInView(0.1);
  const { ref: capRef,  visible: capVisible  } = useInView(0.1);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const [health, pipelineInfo] = await Promise.allSettled([
          checkHealth(), getPipelineInfo(),
        ]);
        if (gone) return;
        let s = { ...DEFAULT_STATS };
        if (health.status === 'fulfilled') {
          const tot = health.value.total_samples;
          if (tot > 0) { s.totalSamples = tot; }
        }
        if (pipelineInfo.status === 'fulfilled') {
          setArchRows(buildArchFromPipeline(pipelineInfo.value));
          if (pipelineInfo.value.total_samples > 0) s.totalSamples = pipelineInfo.value.total_samples;
        }
        setStats(s);
      } catch { /* silent fallback */ } finally { if (!gone) setLoading(false); }
    })();
    return () => { gone = true; };
  }, []);

  const tickerItems  = [...ticker, ...ticker];
  const tickDuration = Math.max(20, tickerItems.length * 3.5);
  const numBand      = [
    { rawStr: stats.tokensProcessed,            label:'MT chrF',          delay:0   },
    { rawStr: stats.inferenceMs,                label:'Worker Latency',   delay:120 },
    { rawStr: stats.uptime,                     label:'Worker Status',    delay:240 },
    { rawStr: stats.activeUsers,                label:'Gateway Mode',     delay:360 },
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
          transition: background 0.25s, box-shadow 0.3s, transform 0.25s !important;
        }
        .cap-card-enhanced:hover {
          background: var(--blueG) !important;
          box-shadow: inset 0 0 0 1px var(--blue), 0 8px 32px rgba(0,0,0,0.1) !important;
          transform: translateY(-2px) !important;
        }
        .cap-card-enhanced:hover .cc-n {
          color: var(--blue) !important;
          letter-spacing: 0.22em !important;
          transition: letter-spacing 0.3s;
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
      <section className="hero" style={{ position:'relative', overflow:'hidden' }}>
        {/* Grid */}
        <div className="hgrid"></div>

        {/* Ambient orbs — subtle blue glow behind ghost text */}
        <div className="hp-orb" style={{
          width:'600px', height:'600px',
          background:'var(--blue)',
          opacity:0.04,
          right:'-120px', bottom:'-180px',
          animationDelay:'0s',
        }}/>
        <div className="hp-orb" style={{
          width:'300px', height:'300px',
          background:'var(--blue)',
          opacity:0.035,
          right:'38%', top:'20%',
          animationDelay:'2s',
        }}/>

        {/* Ghost lettermark */}
        <div className="h-ghost">VT</div>

        <div className="hero-inner">
          {/* Topbar */}
          <div className="h-topbar" style={{ animation:'hp-fadeup 0.6s cubic-bezier(0.22,1,0.36,1) both' }}>
            <span className="h-eyebrow">AI-Powered In-Image Translation</span>
            <span className="h-meta">v2.4 · Made in Vietnam<br />DeBackX E2E Architecture</span>
          </div>

          {/* Display */}
          <div className="hero-display">
            {/* Label */}
            <div className="hd-label" style={{ animation:'hp-fadeup 0.55s 0.08s cubic-bezier(0.22,1,0.36,1) both' }}>
              01 — In-Image Translation Engine
            </div>

            {/* Headline */}
            <h1 className="hd-headline" style={{ margin:0 }}>
              <span
                className="hd-word hd-w1"
                style={{ animation:'hp-fadeup 0.7s 0.12s cubic-bezier(0.22,1,0.36,1) both' }}
              >
                TRANS
              </span>
              <span
                className="hd-word hd-w2"
                style={{ animation:'hp-fadeup 0.7s 0.22s cubic-bezier(0.22,1,0.36,1) both' }}
              >
                LATE<span className="hd-dot">.</span>
              </span>
            </h1>

            {/* Sub row */}
            <div className="hd-sub">
              <div className="hd-tagline" style={{ animation:'hp-fadeup 0.6s 0.3s cubic-bezier(0.22,1,0.36,1) both' }}>
                <div className="hd-tl1">Every image,<br />every language.</div>
                <div className="hd-tl2">— instantly, with AI</div>
              </div>
              <div className="hd-sep"></div>
              <div className="hd-desc-col" style={{ animation:'hp-fadeup 0.6s 0.38s cubic-bezier(0.22,1,0.36,1) both' }}>
                <p className="hd-desc">
                  VieTrans sends each uploaded image to the DebackX worker, where PaddleOCR,
                  a fine-tuned NLLB 1.3B model, and the renderer produce the translated result.
                </p>
                <div className="hd-ctas">
                  <Link to="/studio" className="btn-primary">Open Studio →</Link>
                  <Link to="/docs"   className="btn-secondary">API Docs</Link>
                </div>
                <div className="hd-pills">
                  {['PaddleOCR','NLLB 1.3B','Mask','Render'].map((p,i) => (
                    <span key={p} className="hd-pill" style={{ animationDelay:`${0.42 + i*0.07}s`, animation:'hp-fadeup 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live ticker */}
        <div className="hero-ticker">
          <span className="ht-lbl">Examples</span>
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
            Submit via drag-and-drop or API. VieTrans keeps the web app light and delegates
            OCR, translation, masking, and rendering to the DebackX worker.
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

              {/* Step icon */}
              <div className="ps-icon">
                <Icon d={step.icon} size={22}/>
              </div>

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
            <div className="sec-h">Worker pipeline.<br />One translated output.</div>
          </div>
          <div className="sec-desc">
            The gateway stays CPU-friendly while the heavy OCR and NLLB inference runs in
            a separate DebackX service that can be deployed on a GPU host.
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
            <div className="sec-h">Image translation<br /><em>for real uploads.</em></div>
          </div>
          <div className="sec-desc">
            The frontend and backend now report live worker results, not precomputed demo
            rows or marketing-only benchmark claims.
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
                transition: `opacity 0.5s ${i*0.08}s, transform 0.5s ${i*0.08}s cubic-bezier(0.22,1,0.36,1), background 0.25s, box-shadow 0.3s`,
              }}
            >
              <div className="cc-n" style={{ transition:'letter-spacing 0.3s' }}>{c.n}</div>
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
