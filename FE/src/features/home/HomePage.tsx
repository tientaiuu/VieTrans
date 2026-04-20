import React from 'react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col">
      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hgrid"></div>
        <div className="h-ghost">VT</div>

        <div className="hero-inner">
          <div className="h-topbar">
            <span className="h-eyebrow">AI-Powered In-Image Translation</span>
            <span className="h-meta">v2.4 · Made in Vietnam<br />PaddleOCR · mBART · LaMa</span>
          </div>

          <div className="hero-display">
            <div className="hd-headline">
              <div className="hd-label">01 — In-Image Translation Engine</div>
              <h1 className="hd-headline">
                <span className="hd-word hd-w1">TRANS</span>
                <span className="hd-word hd-w2">LATE<span className="hd-dot">.</span></span>
              </h1>
            </div>

            <div className="hd-sub">
              <div className="hd-tagline">
                <div className="hd-tl1">Every image,<br />every language.</div>
                <div className="hd-tl2">— instantly, with AI</div>
              </div>
              <div className="hd-sep"></div>
              <div className="hd-desc-col">
                <p className="hd-desc">VieTrans is the only in-image translation engine that detects text, erases it, reconstructs the background, and renders your translation — in a single API call.</p>
                <div className="hd-ctas">
                  <Link to="/studio" className="btn-primary">Open Studio →</Link>
                  <Link to="/docs" className="btn-secondary">API Docs</Link>
                </div>
                <div className="hd-pills">
                  <span className="hd-pill">PaddleOCR</span><span className="hd-pill">mBART-50</span>
                  <span className="hd-pill">LaMa</span><span className="hd-pill">SOC 2</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-ticker">
          <span className="ht-lbl">Live stream</span>
          <div className="ht-track">
            <div className="ht-inner">
              <span className="ht-item">"Welcome to Vietnam" → <b>Chào mừng đến Việt Nam</b></span>
              <span className="ht-item">"Chapter 1: The Beginning" → <b>Chương 1: Khởi Đầu</b></span>
              <span className="ht-item">"Sale 50% Off" → <b>Giảm giá 50%</b></span>
              <span className="ht-item">"Fresh Daily Specials" → <b>Đặc Sản Hàng Ngày</b></span>
              <span className="ht-item">"Restricted Area" → <b>Khu Vực Cấm</b></span>
              {/* Duplicate for infinite loop */}
              <span className="ht-item">"Welcome to Vietnam" → <b>Chào mừng đến Việt Nam</b></span>
              <span className="ht-item">"Chapter 1: The Beginning" → <b>Chương 1: Khởi Đầu</b></span>
              <span className="ht-item">"Sale 50% Off" → <b>Giảm giá 50%</b></span>
              <span className="ht-item">"Fresh Daily Specials" → <b>Đặc Sản Hàng Ngày</b></span>
            </div>
          </div>
          <div className="ht-stats">
            <div><div className="hts-n">12.4M</div><div className="hts-l">Requests</div></div>
            <div><div className="hts-n">98.2%</div><div className="hts-l">Accuracy</div></div>
            <div><div className="hts-n">&lt;1.2s</div><div className="hts-l">Latency</div></div>
          </div>
        </div>
      </section>

      {/* ─── PROCESS ─── */}
      <section className="sec proc-bg">
        <div className="sec-hdr">
          <div>
            <span className="sec-lbl">01 — How It Works</span>
            <div className="sec-h">One upload.<br />Four steps.<br /><em>Zero effort.</em></div>
          </div>
          <div className="sec-desc">Submit via drag-and-drop or API. VieTrans runs four AI layers and returns a fully translated image in under 1.2 s on average.</div>
        </div>
        <div className="pipeline">
          <div className="pipe-step">
            <div className="ps-n">01 / DETECT</div>
            <div className="ps-h">Vision & OCR</div>
            <div className="ps-p">PaddleOCR + CRAFT locates every text region — handles rotated, stylized, and handwritten characters at 98.2% accuracy.</div>
            <div className="ps-tag">PaddleOCR · CRAFT</div>
          </div>
          <div className="pipe-step">
            <div className="ps-n">02 / TRANSLATE</div>
            <div className="ps-h">Neural Translation</div>
            <div className="ps-p">Vietnamese-first mBART model, fine-tuned on 50 M EN-VI sentence pairs, delivers full semantic and cultural context.</div>
            <div className="ps-tag">mBART · PhoBERT</div>
          </div>
          <div className="pipe-step">
            <div className="ps-n">03 / ERASE</div>
            <div className="ps-h">Smart Inpainting</div>
            <div className="ps-p">LaMa-based inpainting removes source text and reconstructs the background with photorealistic coherence.</div>
            <div className="ps-tag">LaMa · ControlNet</div>
          </div>
          <div className="pipe-step">
            <div className="ps-n">04 / RENDER</div>
            <div className="ps-h">Font Matching</div>
            <div className="ps-p">Rendered using a matched font from our 2 000+ library — preserving weight, style, size, and alignment of the original.</div>
            <div className="ps-tag">FontMatcher · AI</div>
          </div>
        </div>
      </section>

      {/* ─── ARCHITECTURE ─── */}
      <section className="sec arch-bg">
        <div className="sec-hdr" style={{ borderBottom: 'var(--ln)' }}>
          <div>
            <span className="sec-lbl">02 — Architecture</span>
            <div className="sec-h">Six layers.<br />One <em>seamless</em> output.</div>
          </div>
          <div className="sec-desc">Each layer is independently benchmarked, versioned, and hot-swappable. 99.9% SLA even as models update.</div>
        </div>
        <div className="at-cols at-head">
          <div className="atc">No.</div><div className="atc">Layer</div><div className="atc">Stack</div><div className="atc" style={{ textAlign: 'right' }}>Metric</div>
        </div>

        {[
          { no: '01', title: 'Vision & OCR', desc: 'Multi-model ensemble for text region detection across all image types and orientations', tags: ['PaddleOCR', 'CRAFT', 'TrOCR'], val: '98.2%', label: 'Accuracy' },
          { no: '02', title: 'Neural Translation', desc: 'Vietnamese-first NMT with cultural and domain-specific fine-tuning across 40+ languages', tags: ['mBART-50', 'PhoBERT', 'ViT5'], val: '40+', label: 'Languages' },
          { no: '03', title: 'Smart Inpainting', desc: 'Photorealistic text removal and background reconstruction with no visible artifacts', tags: ['LaMa', 'ControlNet', 'SDv2'], val: '2K+', label: 'Font Library' },
          { no: '04', title: 'Edge Processing', desc: '12-PoP distributed network with SEA-priority routing and gRPC streaming', tags: ['gRPC', 'WebSocket', 'CDN'], val: '<200ms', label: 'SEA Latency' },
        ].map(row => (
          <div className="at-cols at-row" key={row.no}>
            <div className="atc">{row.no}</div>
            <div className="atc">
              <div className="at-h">{row.title}</div>
              <div className="at-p">{row.desc}</div>
            </div>
            <div className="atc">
              <div className="at-tags">
                {row.tags.map(t => <span className="at-tag" key={t}>{t}</span>)}
              </div>
            </div>
            <div className="atc">
              <div className="at-n">{row.val}</div>
              <div className="at-l">{row.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ─── CAPABILITIES ─── */}
      <section className="sec cap-bg">
        <div className="sec-hdr">
          <div>
            <span className="sec-lbl">03 — Capabilities</span>
            <div className="sec-h">Deep visual <br /><em>intelligence.</em></div>
          </div>
          <div className="sec-desc">Beyond simple translation. VieTrans understands layout, depth, and typography to deliver a native-looking result.</div>
        </div>
        <div className="cap-grid">
          {[
            { n: '01', h: 'Vertical & Rotated Text', p: 'Advanced detection logic handles text at any angle, including vertical East Asian scripts and skewed perspective text.' },
            { n: '02', h: 'Multi-Language Fusion', p: 'Translate images containing multiple source languages into a single target language with perfect coherence.' },
            { n: '03', h: 'Smart Font Matching', p: 'We match weight, slant, tracking, and style to ensure your translation feels like it was part of the original design.' },
            { n: '04', h: 'Context Reconstruction', p: 'Using LaMa inpainting to erase text and reconstruct complex background textures, gradients, and subtle noise.' },
            { n: '05', h: 'Batch API Access', p: 'Process thousands of images simultaneously with our high-throughput gRPC and WebSocket API interfaces.' },
            { n: '06', h: 'Enterprise Security', p: 'SOC 2 Type II compliant processing. Your images are never used for model training without explicit consent.' },
          ].map(c => (
            <div className="cap-card" key={c.n}>
              <div className="cc-n">{c.n}</div>
              <div className="cc-h">{c.h}</div>
              <div className="cc-p">{c.p}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── NUMBERS BAND ─── */}
      <section className="numbers">
        <div className="num-c">
          <div className="num-n">50M+</div>
          <div className="num-l">Tokens Processed</div>
        </div>
        <div className="num-c">
          <div className="num-n">12ms</div>
          <div className="num-l">Inference Latency</div>
        </div>
        <div className="num-c">
          <div className="num-n">99.9%</div>
          <div className="num-l">Service Uptime</div>
        </div>
        <div className="num-c">
          <div className="num-n">14k</div>
          <div className="num-l">Active Users</div>
        </div>
      </section>

      {/* ─── CTA BAND ─── */}
      <section className="cta-band">
        <h2>Ready to Translate Your <em>Images?</em></h2>
        <div className="cta-acts">
          <Link to="/studio" className="cb-wh">Get Started Now</Link>
          <Link to="/docs" className="cb-out">View API Docs</Link>
        </div>
      </section>
    </div>
  );
};
