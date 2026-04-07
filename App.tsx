import React, { useState, useEffect } from 'react';
import { Upload, Languages, Loader2, Download, RefreshCw} from 'lucide-react';
import { createWorker } from 'tesseract.js';

// Simple Icons & Lucide as SVGs to match personal-website-v2
const Icons = {
  Sun: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
  ),
  Moon: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  ),
  Mail: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  ),
  Github: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
  ),
  Linkedin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
  ),
  Scholar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5.242 13.769L0.5 9.5 12 1l11.5 8.5-4.758 4.269C18.155 13.313 17.34 13 16.5 13c-1.203 0-2.251 0.641-2.834 1.597l-1.666-1.597L12 13l-6.758 0.769zM12 15l4.5 4.5V23l-4.5-3-4.5 3v-3.5L12 15z"/></svg>
  ),
  Orcid: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.541 0 .942.428.942.946s-.401.946-.942.946c-.538 0-.948-.428-.948-.946s.41-.946.948-.946zm.769 1.488H6.511V18.12h1.627V5.866zm1.385-1.488h3.367c3.483 0 5.253 2.535 5.253 5.432 0 3.037-1.848 5.484-5.223 5.484h-3.397V4.378zm1.627 1.488v7.942h1.492c2.427 0 3.824-1.745 3.824-3.953 0-2.251-1.405-3.989-3.824-3.989h-1.492z"/></svg>
  )
};

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [heroStyle, setHeroStyle] = useState<'minimal'| 'mono' | 'typographic'>('typographic');

  // Custom Cursor Logic
  useEffect(() => {
    const dot = document.getElementById('cursor-dot');
    if (dot && !window.matchMedia('(pointer: coarse)').matches) {
      let rx = 0, ry = 0, tx = 0, ty = 0;
      const onMouseMove = (e: MouseEvent) => {
        tx = e.clientX;
        ty = e.clientY;
        if (!dot.classList.contains('cd-visible')) dot.classList.add('cd-visible');
      };
      const onMouseLeave = () => dot.classList.remove('cd-visible');
      const onMouseOver = (e: MouseEvent) => {
        if ((e.target as Element).closest('a, button, label, .btn, .nav-link, .image-card, .upload-zone')) {
          dot.classList.add('cd-hover');
        }
      };
      const onMouseOut = (e: MouseEvent) => {
        if ((e.target as Element).closest('a, button, label, .btn, .nav-link, .image-card, .upload-zone')) {
          dot.classList.remove('cd-hover');
        }
      };

      window.addEventListener('mousemove', onMouseMove, { passive: true });
      document.addEventListener('mouseleave', onMouseLeave);
      document.addEventListener('mouseover', onMouseOver);
      document.addEventListener('mouseout', onMouseOut);

      const loop = () => {
        rx += (tx - rx) * 0.18;
        ry += (ty - ry) * 0.18;
        dot.style.transform = `translate(${rx}px, ${ry}px)`;
        requestAnimationFrame(loop);
      };
      const raf = requestAnimationFrame(loop);

      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', onMouseLeave);
        document.removeEventListener('mouseover', onMouseOver);
        document.removeEventListener('mouseout', onMouseOut);
        cancelAnimationFrame(raf);
      };
    }
  }, []);

  // Scroll Reveal Logic
  useEffect(() => {
    const allReveal = document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-left], [data-reveal-scale]');
    
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      allReveal.forEach(el => el.classList.add('revealed'));
    } else {
      const seen = new Set<Element>();
      allReveal.forEach(el => {
        const parent = el.parentElement;
        if (!parent || seen.has(parent)) return;
        seen.add(parent);
        parent
          .querySelectorAll<HTMLElement>('[data-reveal],[data-reveal-left],[data-reveal-scale]')
          .forEach((sib, i) => { sib.dataset.revealDelay = String(i * 0.08); });
      });

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = parseFloat(el.dataset.revealDelay ?? '0');
          setTimeout(() => el.classList.add('revealed'), delay * 1000);
          observer.unobserve(el);
        });
      }, { threshold: 0.07 });

      allReveal.forEach(el => observer.observe(el));
      return () => observer.disconnect();
    }
  }, [image, afterImage, isProcessing]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setAfterImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const translateText = async (text: string) => {
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`);
      const data = await response.json();
      return data.responseData?.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const processImage = async () => {
    if (!image) return;
    setIsProcessing(true);
    setStatus('Initializing OCR...');
    
    try {
      const worker = await createWorker('eng');
      setStatus('Analyzing image structure...');
      const { data } = await worker.recognize(image);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = image;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        setStatus('Translating & Overlaying...');
        for (const block of data.blocks || []) {
          for (const paragraph of block.paragraphs || []) {
            for (const line of paragraph.lines || []) {
              const translated = await translateText(line.text);
              
              ctx.fillStyle = theme === 'light' ? 'white' : '#161618';
              ctx.fillRect(line.bbox.x0, line.bbox.y0, line.bbox.x1 - line.bbox.x0, line.bbox.y1 - line.bbox.y0);
              
              const fontSize = (line.bbox.y1 - line.bbox.y0) * 0.8;
              ctx.font = `${fontSize}px "CMU Serif"`;
              ctx.fillStyle = theme === 'light' ? 'black' : '#E8E8E8';
              ctx.fillText(translated, line.bbox.x0, line.bbox.y1 - (line.bbox.y1 - line.bbox.y0) * 0.2);
            }
          }
        }
      }
      
      setAfterImage(canvas.toDataURL());
      await worker.terminate();
    } catch (error) {
      console.error('Processing Error:', error);
      setStatus('Error processing image.');
    } finally {
      setIsProcessing(false);
      setStatus('');
    }
  };

  return (
    <>
      <div id="cursor-dot"></div>
      
      <nav>
        <div className="nav-container">
          <a href="#" className="nav-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="24" height="24" fill="var(--color-accent)"></rect>
              <text x="12" y="17" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="13" font-weight="700" fill="white" letter-spacing="-0.5">I</text>
            </svg>
            <span className="nav-logo-text">IMT</span>
          </a>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex nav-links">
              <a href="#" className="nav-link">Home</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="nav-link">GitHub</a>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-1.5 text-muted hover:text-accent transition-colors theme-toggle-btn"
              aria-label="Toggle Theme"
            >
              <span className="theme-icon-wrap">
                {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
              </span>
            </button>
          </div>
        </div>
      </nav>

      <main>
        <div className="container">
          <section className={`hero-wrap hero-${heroStyle}`}>
            <div className="hero-style-switcher">
              {(['minimal', 'mono', 'typographic'] as const).map((style) => (
                <button
                  key={style}
                  className={`style-btn ${heroStyle === style ? 'active' : ''}`}
                  onClick={() => setHeroStyle(style)}
                  title={`Switch to ${style} style`}
                />
              ))}
            </div>
            <span className="hero-tagline">In-Image Machine Translation</span>
            <h1 className="hero-title">
              Visual <span>Translation</span>
            </h1>
            <p className="hero-description">
             Hệ thống dịch tự động Anh-Việt cho văn bản trong hình ảnh
            </p>
          </section>

          <section className="max-w-5xl mx-auto mb-24" data-reveal>
            <div className="image-grid-wrap">
              {!image ? (
                <div className="image-card rounded-sm border-dashed" style={{ aspectRatio: '21/9' }}>
                  <label className="upload-zone">
                    <div className="upload-icon-box">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Nhấp hoặc kéo thả để tải ảnh lên</p>
                    <p className="meta text-[9px] uppercase mt-2 opacity-50">EN → VI • PNG, JPG, WEBP</p>
                    <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                  </label>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="image-grid">
                    <div className="image-card rounded-sm">
                      <span className="image-label">Original</span>
                      <img src={image} alt="Original" />
                    
                    </div>
                    
                    <div className="image-card rounded-sm min-h-[200px] flex items-center justify-center border-dashed">
                      <span className="image-label">Translated</span>
                      {afterImage ? (
                        <img src={afterImage} alt="Translated" />
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-muted p-8 text-center">
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin text-accent" />
                              <span className="font-mono text-[10px] uppercase tracking-widest">{status}</span>
                            </>
                          ) : (
                            <>
                              <Languages className="w-8 h-8 opacity-20" />
                              <p className="meta text-[10px] uppercase">Chưa có kết quả dịch</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    {afterImage ? (
                      <div className="post-translation-controls">
                        <button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.download = 'translated-image.png';
                            link.href = afterImage;
                            link.click();
                          }}
                          className="btn btn-primary px-8"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Tải ảnh về
                        </button>
                        
                        <button 
                          onClick={() => { setImage(null); setAfterImage(null); }}
                          className="btn btn-secondary px-8"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Dịch ảnh khác
                        </button>
                      </div>
                    ) : !isProcessing && (
                      <button onClick={processImage} className="btn btn-primary px-12 py-4 text-sm tracking-widest">
                        <Languages className="w-4 h-4" />
                        Bắt đầu xử lý & dịch
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer>
        <div className="footer-bg-pattern"></div>
        <div className="container">
          <div className="footer-content">
            <p className="meta text-[11px] opacity-40">© 2026</p>
            <div className="footer-social-links">
              <a href="mailto:tiendatt.716@gmail.com" className="footer-social-link" title="Email">
                <Icons.Mail />
              </a>
              <a href="https://github.com/d41sys" target="_blank" rel="noopener noreferrer" className="footer-social-link" title="GitHub">
                <Icons.Github />
              </a>
              <a href="https://linkedin.com/in/tien-datle716" target="_blank" rel="noopener noreferrer" className="footer-social-link" title="LinkedIn">
                <Icons.Linkedin />
              </a>
              <a href="https://orcid.org" target="_blank" rel="noopener noreferrer" className="footer-social-link" title="ORCID">
                <Icons.Orcid />
              </a>
              <a href="https://scholar.google.com" target="_blank" rel="noopener noreferrer" className="footer-social-link" title="Google Scholar">
                <Icons.Scholar />
              </a>
              <a href="https://x.com/d41sy___" target="_blank" rel="noopener noreferrer" className="footer-social-link" title="X (Twitter)">
                <Icons.X />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
