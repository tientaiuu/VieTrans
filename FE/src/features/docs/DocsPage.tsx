import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Copy, Check, Search, BookOpen, ShieldCheck,
  Menu, X, ChevronRight, HelpCircle, AlertTriangle,
  ArrowRight, Zap, Lock, Activity, Package, LifeBuoy,
  ChevronDown, Globe, Code2,
} from 'lucide-react';

// ── Google Fonts loader ──────────────────────────────────────────────────────
// Syne (display), Lora (body serif), JetBrains Mono (code)
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
  `}</style>
);

// ── Scoped CSS for docs — uses app CSS variables (--bg, --ink, --gold, etc.) ─
const DocsCSS = () => (
  <style>{`
    /* ── Docs fonts override (scoped to .docs-root) ── */
    .docs-root {
      font-family: 'Lora', Georgia, serif;
    }

    /* scrollbar */
    .docs-root ::-webkit-scrollbar { width: 5px; height: 5px; }
    .docs-root ::-webkit-scrollbar-track { background: transparent; }
    .docs-root ::-webkit-scrollbar-thumb {
      background: var(--docs-border);
      border-radius: 99px;
    }

    /* Subtle grid bg using app border color */
    .docs-bg-grid {
      background-image:
        linear-gradient(var(--docs-border) 1px, transparent 1px),
        linear-gradient(90deg, var(--docs-border) 1px, transparent 1px);
      background-size: 48px 48px;
    }

    /* Gold pulse */
    @keyframes docs-gold-pulse {
      0%, 100% { opacity: 0.6; }
      50%       { opacity: 1; }
    }

    /* Code scanline (subtle — darkened in light mode via opacity) */
    @keyframes docs-scanline {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(400%); }
    }
    .docs-code-scanline { position: relative; overflow: hidden; }
    .docs-code-scanline::after {
      content: '';
      position: absolute;
      inset-x: 0;
      height: 40px;
      background: linear-gradient(transparent, var(--blueG), transparent);
      animation: docs-scanline 5s linear infinite;
      pointer-events: none;
    }

    /* Fade-up animation */
    @keyframes docs-fade-up {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .docs-fade-up { animation: docs-fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both; }

    /* Param row hover */
    .docs-param-row { transition: background 0.15s; }
    .docs-param-row:hover td { background: var(--blueG) !important; }

    /* Method badges — use app theme vars defined in index.css */
    .docs-badge-post {
      background: var(--docs-method-post-bg);
      color:      var(--docs-method-post-clr);
      border: 1px solid var(--docs-method-post-brd);
    }
    .docs-badge-get {
      background: var(--docs-method-get-bg);
      color:      var(--docs-method-get-clr);
      border: 1px solid var(--docs-method-get-brd);
    }

    /* Sidebar link hover */
    .docs-sidebar-link { transition: all 0.15s; }
    .docs-sidebar-link:hover:not(.docs-sidebar-link--active) {
      color: var(--ink) !important;
      background: color-mix(in srgb, var(--ink) 5%, transparent) !important;
    }

    /* Section rule */
    .docs-rule {
      border: none;
      border-top: 1px solid var(--docs-border);
    }

    /* Code block border — gold-tinted in dark, subtle in light */
    .docs-code-block {
      background: var(--docs-code-bg);
      border: 1px solid color-mix(in srgb, var(--blue) 20%, var(--docs-border) 80%);
      border-radius: 12px;
      overflow: hidden;
      box-shadow:
        0 0 0 1px rgba(0,0,0,0.06),
        0 16px 40px rgba(0,0,0,0.10);
    }
    .docs-code-header {
      background: var(--docs-code-hd);
      border-bottom: 1px solid color-mix(in srgb, var(--blue) 12%, var(--docs-border) 88%);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .docs-code-pre {
      padding: 20px;
      font-family: 'JetBrains Mono', 'Space Mono', monospace;
      font-size: 12px;
      line-height: 1.9;
      color: var(--docs-code-text);
      overflow-x: auto;
      margin: 0;
    }

    /* Tab button */
    .docs-lang-tab {
      font-family: 'JetBrains Mono', 'Space Mono', monospace;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
      background: transparent;
      color: var(--ink4);
    }
    .docs-lang-tab--active {
      background: var(--blueG);
      color: var(--blue);
      outline: 1px solid color-mix(in srgb, var(--blue) 30%, transparent);
    }

    /* Copy button */
    .docs-copy-btn {
      font-family: 'JetBrains Mono', 'Space Mono', monospace;
      font-size: 10px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      background: transparent;
      color: var(--ink4);
      transition: all 0.15s;
    }
    .docs-copy-btn:hover {
      background: var(--blueG);
      color: var(--blue);
    }

    /* Response block (green/red tinted) */
    .docs-response-block {
      border-radius: 12px;
      overflow: hidden;
      background: var(--docs-code-bg);
    }
    .docs-response-block--ok {
      border: 1px solid color-mix(in srgb, var(--docs-method-post-clr) 25%, transparent);
    }
    .docs-response-block--err {
      border: 1px solid rgba(224,92,92,0.25);
    }
    .docs-response-hd--ok {
      background: color-mix(in srgb, var(--docs-method-post-clr) 8%, var(--docs-code-hd));
      border-bottom: 1px solid color-mix(in srgb, var(--docs-method-post-clr) 15%, transparent);
    }
    .docs-response-hd--err {
      background: rgba(224,92,92,0.06);
      border-bottom: 1px solid rgba(224,92,92,0.15);
    }
    .docs-status-ok {
      background: color-mix(in srgb, var(--docs-method-post-clr) 12%, transparent);
      color: var(--docs-method-post-clr);
      border: 1px solid color-mix(in srgb, var(--docs-method-post-clr) 22%, transparent);
    }
    .docs-status-err {
      background: rgba(224,92,92,0.12);
      color: #E05C5C;
      border: 1px solid rgba(224,92,92,0.22);
    }

    /* Overview cards */
    .docs-pipeline-card {
      padding: 20px;
      border-radius: 12px;
      border: 1px solid var(--docs-border);
      background: var(--paper);
      transition: border-color 0.2s, box-shadow 0.2s;
      cursor: default;
    }
    .docs-pipeline-card:hover {
      border-color: color-mix(in srgb, var(--blue) 35%, transparent);
      box-shadow: 0 0 40px var(--blueG);
    }

    /* TOC active line */
    .docs-toc-btn {
      text-align: left;
      font-family: 'Lora', Georgia, serif;
      font-size: 12px;
      padding: 6px 0 6px 14px;
      border-top: none;
      border-right: none;
      border-bottom: none;
      background: none;
      cursor: pointer;
      outline: none;
      display: block;
      width: 100%;
      transition: all 0.15s;
    }
    .docs-toc-btn--active {
      color: var(--blue);
      font-weight: 600;
      border-left: 2px solid var(--blue);
    }
    .docs-toc-btn--idle {
      color: var(--ink4);
      font-weight: 400;
      border-left: 2px solid var(--docs-border);
    }
    .docs-toc-btn--idle:hover { color: var(--ink); }

    /* Auth warning box */
    .docs-warning-box {
      padding: 14px 18px;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--blue) 25%, transparent);
      background: var(--blueG);
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    /* Tablet/mobile responsive */
    @media (max-width: 1023px) {
      .docs-left-aside { display: none !important; }
      .docs-mobile-bar { display: flex !important; }
    }
    @media (max-width: 1279px) {
      .docs-right-toc { display: none !important; }
    }

    /* Spin animation for key generation */
    @keyframes docs-spin { to { transform: rotate(360deg); } }
  `}</style>
);

// ─── Types ───────────────────────────────────────────────────────────────────
type LangTab = 'curl' | 'js' | 'python' | 'php';

interface NavItem {
  id: string;
  label: string;
  method?: 'GET' | 'POST';
  icon?: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// ─── Navigation Data ─────────────────────────────────────────────────────────
const navGroups: NavGroup[] = [
  {
    title: 'Introduction',
    items: [{ id: 'overview', label: 'Overview', icon: <BookOpen size={13} /> }],
  },
  {
    title: 'Getting Started',
    items: [
      { id: 'quick-start', label: 'Quick Start', icon: <Zap size={13} /> },
      { id: 'authentication', label: 'Authentication', icon: <Lock size={13} /> },
      { id: 'rate-limits', label: 'Rate Limits', icon: <Activity size={13} /> },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { id: 'upload', label: 'Process Image', method: 'POST' as const },
      { id: 'inpainting', label: 'Erase & Inpaint', method: 'POST' as const },
      { id: 'history', label: 'Get History', method: 'GET' as const },
    ],
  },
  {
    title: 'Resources',
    items: [
      { id: 'errors', label: 'Error Codes', icon: <AlertTriangle size={13} /> },
      { id: 'sdks', label: 'SDKs & Libraries', icon: <Package size={13} /> },
      { id: 'faq', label: 'FAQ', icon: <HelpCircle size={13} /> },
    ],
  },
];

const allItems = navGroups.flatMap((g) => g.items);

// ─── Code Snippets ────────────────────────────────────────────────────────────
const getUploadCode = (apiKey: string): Record<LangTab, string> => ({
  curl: `curl -X POST https://api.vietrans.com/v1/upload \\
  -H "X-API-Key: ${apiKey}" \\
  -F "file=@/path/to/image.png" \\
  -F "target_lang=vi"`,
  js: `const form = new FormData();
form.append('file', fileInput.files[0]);
form.append('target_lang', 'vi');

const res = await fetch('https://api.vietrans.com/v1/upload', {
  method: 'POST',
  headers: { 'X-API-Key': '${apiKey}' },
  body: form,
});

const data = await res.json();
console.log(data.stages.fuse);`,
  python: `import requests

resp = requests.post(
    "https://api.vietrans.com/v1/upload",
    headers={"X-API-Key": "${apiKey}"},
    files={"file": open("image.png", "rb")},
    data={"target_lang": "vi"},
)
print(resp.json())`,
  php: `<?php
$curl = curl_init('https://api.vietrans.com/v1/upload');
curl_setopt_array($curl, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['X-API-Key: ${apiKey}'],
  CURLOPT_POSTFIELDS => [
    'file'        => new CURLFile('/path/to/image.png'),
    'target_lang' => 'vi',
  ],
]);
echo curl_exec($curl);`,
});

const getHistoryCode = (apiKey: string): Record<LangTab, string> => ({
  curl: `curl "https://api.vietrans.com/v1/history?page=1&limit=10" \\
  -H "X-API-Key: ${apiKey}"`,
  js: `const res = await fetch(
  'https://api.vietrans.com/v1/history?page=1&limit=10',
  { headers: { 'X-API-Key': '${apiKey}' } }
);
const { data, pagination } = await res.json();`,
  python: `resp = requests.get(
    "https://api.vietrans.com/v1/history",
    headers={"X-API-Key": "${apiKey}"},
    params={"page": 1, "limit": 10},
)`,
  php: `<?php
$url = 'https://api.vietrans.com/v1/history?page=1&limit=10';
$curl = curl_init($url);
curl_setopt($curl, CURLOPT_HTTPHEADER, ['X-API-Key: ${apiKey}']);
echo curl_exec($curl);`,
});

// ─── Syntax Highlight (theme-aware colors via inline) ────────────────────────
// String/number tokens use relative opacity so they look ok on both themes
const SyntaxHighlight: React.FC<{ code: string }> = ({ code }) => {
  const hl = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // strings
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="docs-hl-str">$1</span>')
    // flags
    .replace(/(\s-{1,2}[\w-]+)/g, '<span class="docs-hl-flag">$1</span>')
    // keywords
    .replace(/\b(import|from|const|let|await|async|new|echo|function|return|true|false|null|undefined|class|print)\b/g,
      '<span class="docs-hl-kw">$1</span>')
    // numbers
    .replace(/\b(\d+)\b/g, '<span class="docs-hl-num">$1</span>')
    // comments
    .replace(/(#[^\n]*|\/\/[^\n]*)/g, '<span class="docs-hl-cmt">$1</span>')
    // json keys
    .replace(/"([^"]+)"(?=:)/g, '<span class="docs-hl-str">"$1"</span>')
    // builtin funcs
    .replace(/\b(curl_init|curl_setopt_array|curl_setopt|curl_exec|CURLOPT_\w+|FormData|fetch|console\.log|requests|open)\b/g,
      '<span class="docs-hl-fn">$1</span>');
  return <code dangerouslySetInnerHTML={{ __html: hl }} />;
};

// Syntax highlight CSS — strings/keys = blue accent, funcs = blue2, keywords = muted red
const SyntaxCSS = () => (
  <style>{`
    .docs-hl-str  { color: var(--blue); }
    .docs-hl-flag { color: var(--blue2, var(--blue)); opacity: 0.85; }
    .docs-hl-kw   { color: #E08080; }
    .docs-hl-num  { color: var(--blue); opacity: 0.75; }
    .docs-hl-cmt  { color: var(--ink4); font-style: italic; }
    .docs-hl-fn   { color: var(--blue); opacity: 0.65; }
  `}</style>
);

// ─── Method Badge ─────────────────────────────────────────────────────────────
const MethodBadge: React.FC<{ method: 'GET' | 'POST' }> = ({ method }) => (
  <span
    className={`inline-flex items-center font-mono text-[9px] font-bold px-2 py-0.5 rounded leading-none tracking-widest uppercase ${
      method === 'POST' ? 'docs-badge-post' : 'docs-badge-get'
    }`}
    style={{ fontFamily: "'JetBrains Mono', 'Space Mono', monospace" }}
  >
    {method}
  </span>
);

// ─── Copy Button ──────────────────────────────────────────────────────────────
const CopyButton: React.FC<{
  text: string;
  id: string;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, id: string) => void;
}> = ({ text, id, copiedStates, onCopy }) => (
  <button className="docs-copy-btn" onClick={() => onCopy(text, id)} title="Copy to clipboard">
    {copiedStates[id] ? (
      <>
        <Check size={11} style={{ color: 'var(--docs-method-post-clr)' }} />
        <span style={{ color: 'var(--docs-method-post-clr)' }}>Copied</span>
      </>
    ) : (
      <>
        <Copy size={11} />
        <span>Copy</span>
      </>
    )}
  </button>
);

// ─── Code Block ───────────────────────────────────────────────────────────────
const CodeBlock: React.FC<{
  id: string;
  title: string;
  tabs: LangTab[];
  snippets: Record<LangTab, string>;
  activeTab: LangTab;
  onTabChange: (tab: LangTab) => void;
  copiedStates: Record<string, boolean>;
  onCopy: (text: string, id: string) => void;
}> = ({ id, title, tabs, snippets, activeTab, onTabChange, copiedStates, onCopy }) => {
  const rendered = snippets[activeTab] || '';

  return (
    <div className="docs-code-block">
      {/* Header */}
      <div className="docs-code-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* macOS traffic lights */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {['#FF5F57', '#FFBD2E', '#28CA42'].map((c, i) => (
              <div key={i} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, opacity: 0.8 }} />
            ))}
          </div>
          <span style={{
            fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
            fontSize: '10px',
            color: 'var(--ink4)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
          }}>
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`docs-lang-tab${activeTab === tab ? ' docs-lang-tab--active' : ''}`}
            >
              {tab === 'js' ? 'Node' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Code area */}
      <div className="docs-code-scanline" style={{ position: 'relative' }}>
        <pre className="docs-code-pre">
          <SyntaxHighlight code={rendered} />
        </pre>
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <CopyButton text={rendered} id={id} copiedStates={copiedStates} onCopy={onCopy} />
        </div>
      </div>
    </div>
  );
};

// ─── Response Block ───────────────────────────────────────────────────────────
const ResponseBlock: React.FC<{
  title: string;
  status: string;
  statusColor: 'green' | 'red';
  json: string;
}> = ({ title, status, statusColor, json }) => {
  const ok = statusColor === 'green';
  return (
    <div className={`docs-response-block ${ok ? 'docs-response-block--ok' : 'docs-response-block--err'}`}>
      <div
        className={`docs-code-header ${ok ? 'docs-response-hd--ok' : 'docs-response-hd--err'}`}
        style={{ justifyContent: 'space-between' }}
      >
        <span style={{
          fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
          fontSize: '10px',
          color: 'var(--ink4)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
        }}>
          {title}
        </span>
        <span className={ok ? 'docs-status-ok' : 'docs-status-err'} style={{
          fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
          fontSize: '10px',
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: '4px',
        }}>
          {status}
        </span>
      </div>
      <pre className="docs-code-pre">
        <SyntaxHighlight code={json} />
      </pre>
    </div>
  );
};

// ─── Section Heading ──────────────────────────────────────────────────────────
const SectionHeading: React.FC<{
  id: string;
  eyebrow?: string;
  label: string;
  refFn: (el: HTMLElement | null) => void;
}> = ({ id, eyebrow, label, refFn }) => (
  <div id={id} ref={refFn} style={{ scrollMarginTop: '100px', marginBottom: '28px' }}>
    {eyebrow && (
      <div style={{
        fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase' as const,
        color: 'var(--blue)',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'var(--blue)', opacity: 0.5 }} />
        {eyebrow}
      </div>
    )}
    <h2 style={{
      fontFamily: "'Syne', 'Bricolage Grotesque', system-ui, sans-serif",
      fontSize: '26px',
      fontWeight: 700,
      color: 'var(--ink)',
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
      margin: 0,
    }}>
      {label}
    </h2>
  </div>
);

// ─── Endpoint Header ──────────────────────────────────────────────────────────
const EndpointHeader: React.FC<{
  id: string;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  refFn: (el: HTMLElement | null) => void;
}> = ({ id, method, path, title, refFn }) => (
  <div id={id} ref={refFn} style={{ scrollMarginTop: '100px', marginBottom: '28px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <MethodBadge method={method} />
      <code style={{
        fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
        fontSize: '13px',
        color: 'var(--ink3)',
        background: 'var(--bg2)',
        padding: '4px 12px',
        borderRadius: '6px',
        border: '1px solid var(--docs-border)',
      }}>
        {path}
      </code>
    </div>
    <h3 style={{
      fontFamily: "'Syne', 'Bricolage Grotesque', system-ui, sans-serif",
      fontSize: '22px',
      fontWeight: 700,
      color: 'var(--ink)',
      letterSpacing: '-0.015em',
      margin: 0,
    }}>
      {title}
    </h3>
  </div>
);

// ─── Param Table ──────────────────────────────────────────────────────────────
const ParamTable: React.FC<{
  params: { name: string; type: string; required: boolean; description: string }[];
}> = ({ params }) => (
  <div style={{
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid var(--docs-border)',
    marginBottom: '24px',
  }}>
    <div style={{
      padding: '10px 20px',
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--docs-border)',
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        color: 'var(--ink4)',
      }}>
        Parameters
      </span>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {params.map((p, i) => (
          <tr
            key={p.name}
            className="docs-param-row"
            style={{ borderTop: i > 0 ? '1px solid var(--docs-border)' : 'none' }}
          >
            <td style={{ padding: '14px 20px', width: '200px', verticalAlign: 'top', background: 'var(--paper)' }}>
              <code style={{
                fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--blue2))',
                display: 'block',
                marginBottom: '3px',
              }}>
                {p.name}
              </code>
              <span style={{
                fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                fontSize: '10px',
                color: 'var(--ink4)',
              }}>
                {p.type}
              </span>
            </td>
            <td style={{ padding: '14px 16px', width: '100px', verticalAlign: 'top', background: 'var(--paper)' }}>
              {p.required ? (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: '#CC3333',
                  background: 'rgba(204,51,51,0.08)',
                  border: '1px solid rgba(204,51,51,0.18)',
                  padding: '3px 7px',
                  borderRadius: '4px',
                }}>
                  required
                </span>
              ) : (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--ink4)',
                  background: 'var(--bg2)',
                  border: '1px solid var(--docs-border)',
                  padding: '3px 7px',
                  borderRadius: '4px',
                }}>
                  optional
                </span>
              )}
            </td>
            <td style={{
              padding: '14px 20px 14px 8px',
              fontSize: '13px',
              fontFamily: "'Lora', Georgia, serif",
              color: 'var(--ink3)',
              lineHeight: 1.75,
              verticalAlign: 'top',
              background: 'var(--paper)',
            }}>
              {p.description}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Sidebar Link ─────────────────────────────────────────────────────────────
const SidebarLink: React.FC<{
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}> = ({ item, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`docs-sidebar-link${isActive ? ' docs-sidebar-link--active' : ''}`}
    style={{
      position: 'relative',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      textAlign: 'left' as const,
      padding: '7px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      fontFamily: "'Lora', Georgia, serif",
      fontWeight: isActive ? 600 : 400,
      color: isActive ? 'var(--blue)' : 'var(--ink3)',
      background: isActive ? 'var(--blueG)' : 'transparent',
      border: isActive ? '1px solid var(--blueG)' : '1px solid transparent',
      cursor: 'pointer',
      outline: 'none',
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {item.icon && (
        <span style={{ color: isActive ? 'var(--blue)' : 'var(--ink4)', flexShrink: 0 }}>
          {item.icon}
        </span>
      )}
      <span>{item.label}</span>
    </span>
    {item.method && <MethodBadge method={item.method} />}
  </button>
);

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
const FaqItem: React.FC<{ q: string; a: string; isLast: boolean }> = ({ q, a, isLast }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{
      borderBottom: isLast ? 'none' : '1px solid var(--docs-border)',
      background: open ? 'var(--blueG)' : 'var(--paper)',
      transition: 'background 0.2s',
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '20px 24px',
          textAlign: 'left' as const,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <span style={{
          fontFamily: "'Syne', 'Bricolage Grotesque', system-ui, sans-serif",
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
        }}>
          {q}
        </span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
          <ChevronRight size={14} style={{ color: open ? 'var(--blue)' : 'var(--ink4)', flexShrink: 0 }} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              padding: '0 24px 20px',
              fontSize: '14px',
              fontFamily: "'Lora', Georgia, serif",
              lineHeight: 1.8,
              color: 'var(--ink3)',
              margin: 0,
            }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main DocsPage ─────────────────────────────────────────────────────────────
export const DocsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiKey, setApiKey] = useState('YOUR_API_KEY');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [codeTabs, setCodeTabs] = useState<Record<string, LangTab>>({
    quickstart: 'curl',
    upload: 'curl',
    inpainting: 'curl',
    history: 'curl',
  });

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); });
      },
      { rootMargin: '-8% 0px -76% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => { sectionRefs.current[id] = el; };

  const scrollTo = useCallback((id: string) => {
    setIsMobileOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const handleTabChange = (blockId: string, tab: LangTab) =>
    setCodeTabs((p) => ({ ...p, [blockId]: tab }));

  const handleGenerateKey = () => {
    setIsGeneratingKey(true);
    setTimeout(() => {
      const hex = Array.from({ length: 20 }, () =>
        Math.floor(Math.random() * 36).toString(36)
      ).join('');
      setApiKey(`vt_live_${hex}`);
      setIsGeneratingKey(false);
    }, 1000);
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((p) => ({ ...p, [id]: true }));
    setTimeout(() => setCopiedStates((p) => ({ ...p, [id]: false })), 2000);
  };

  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.id.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((g) => g.items.length > 0);

  const uploadCode = getUploadCode(apiKey);
  const historyCode = getHistoryCode(apiKey);

  // ── Sidebar content ──────────────────────────────────────────────────────
  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: '20px' }}>
      {/* Logo */}
      <div style={{
        padding: '0 20px 18px',
        borderBottom: '1px solid var(--docs-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: '28px', height: '28px',
          background: 'var(--blueG)',
          border: '1px solid var(--blueG)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Globe size={14} style={{ color: 'var(--blue)' }} />
        </div>
        <div>
          <div style={{
            fontFamily: "'Syne', 'Bricolage Grotesque', system-ui, sans-serif",
            fontSize: '13px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em',
          }}>
            VieTrans
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
            fontSize: '9px', color: 'var(--blue)', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
          }}>
            API v1
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--docs-border)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink4)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search docs…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 30px',
              fontSize: '12px',
              fontFamily: "'Lora', Georgia, serif",
              borderRadius: '8px',
              background: 'var(--bg2)',
              border: '1px solid var(--docs-border)',
              color: 'var(--ink)',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--blueG)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--docs-border)'; }}
          />
        </div>
      </div>

      {/* Nav groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 40px' }}>
        {filteredGroups.map((group, i) => (
          <div key={i} style={{ marginBottom: '22px' }}>
            <p style={{
              fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
              fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase' as const, color: 'var(--ink4)',
              marginBottom: '8px', paddingLeft: '14px',
            }}>
              {group.title}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.items.map((item) => (
                <SidebarLink
                  key={item.id}
                  item={item}
                  isActive={activeSection === item.id}
                  onClick={() => scrollTo(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--ink4)', paddingTop: '16px' }}>
            No results.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="docs-root" style={{ paddingTop: '66px', minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', transition: 'background 0.35s, color 0.35s' }}>
      <FontLoader />
      <DocsCSS />
      <SyntaxCSS />

      {/* ── Mobile top bar ────────────────────────────────────────── */}
      <div
        className="docs-mobile-bar"
        style={{
          display: 'none',
          position: 'sticky', top: '66px', zIndex: 40,
          alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--docs-border)',
        }}
      >
        <button
          onClick={() => setIsMobileOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '13px',
            fontFamily: "'Syne', 'Bricolage Grotesque', system-ui, sans-serif",
            fontWeight: 600, color: 'var(--ink2)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, outline: 'none',
          }}
        >
          <Menu size={16} style={{ color: 'var(--blue)' }} />
          <span>Docs</span>
          <ChevronDown size={13} style={{ color: 'var(--ink4)' }} />
        </button>
        <span style={{ fontSize: '12px', color: 'var(--ink3)', fontFamily: "'Lora', Georgia, serif" }}>
          {allItems.find((i) => i.id === activeSection)?.label}
        </span>
      </div>

      {/* ── Three-column layout ────────────────────────────────────── */}
      <div style={{ display: 'flex', maxWidth: '1440px', margin: '0 auto' }}>

        {/* Left sidebar */}
        <aside
          className="docs-left-aside"
          style={{
            width: '260px', flexShrink: 0,
            position: 'sticky', top: '66px', height: 'calc(100vh - 66px)',
            borderRight: '1px solid var(--docs-border)',
            overflow: 'hidden',
            background: 'var(--bg)',
            transition: 'background 0.35s',
          }}
        >
          {sidebarContent}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0, padding: '60px 64px 120px', maxWidth: '860px' }}>

          {/* ── HERO ───────────────────────────────────────────────── */}
          <div className="docs-fade-up" style={{ marginBottom: '80px' }}>
            {/* Eyebrow badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '999px',
                background: 'var(--blueG)',
                border: '1px solid var(--blueG)',
              }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--blue)',
                  animation: 'docs-gold-pulse 2s ease-in-out infinite',
                }} />
                <span style={{
                  fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                  fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const, color: 'var(--blue)',
                }}>
                  API v1 · REST
                </span>
              </div>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: "'Syne', 'Bricolage Grotesque', system-ui, sans-serif",
              fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 800,
              letterSpacing: '-0.04em', lineHeight: 1.05,
              color: 'var(--ink)', marginBottom: '24px',
            }}>
              VieTrans{' '}
              <em style={{
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: 'italic', fontWeight: 400,
                color: 'var(--blue)',
              }}>
                API Reference
              </em>
            </h1>

            <p style={{
              fontSize: '16px', fontFamily: "'Lora', Georgia, serif",
              lineHeight: 1.8, color: 'var(--ink3)',
              maxWidth: '560px', marginBottom: '36px',
            }}>
              A single REST endpoint runs the 4-stage DeBackX model: separating text, quantizing visual features,
              translating codes, and fusing the translated text back onto the clean backdrop. Averaged under 1.2&nbsp;s.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
              <button
                onClick={handleGenerateKey}
                disabled={isGeneratingKey}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '11px 20px', fontSize: '13px',
                  fontFamily: "'Syne', 'Bricolage Grotesque', system-ui, sans-serif",
                  fontWeight: 600, letterSpacing: '-0.01em',
                  color: 'var(--bg)',
                  background: 'var(--blue)',
                  border: 'none', borderRadius: '10px',
                  cursor: isGeneratingKey ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 4px 20px var(--blueG)',
                  outline: 'none',
                  opacity: isGeneratingKey ? 0.7 : 1,
                }}
              >
                {isGeneratingKey ? (
                  <>
                    <div style={{
                      width: '14px', height: '14px',
                      border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--bg)',
                      borderRadius: '50%',
                      animation: 'docs-spin 0.7s linear infinite',
                    }} />
                    Generating…
                  </>
                ) : (
                  <>
                    <Key size={14} />
                    {apiKey === 'YOUR_API_KEY' ? 'Get your API Key' : 'Regenerate Key'}
                  </>
                )}
              </button>

              <button
                onClick={() => scrollTo('upload')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '11px 20px', fontSize: '13px',
                  fontFamily: "'Syne', 'Bricolage Grotesque', system-ui, sans-serif",
                  fontWeight: 600, letterSpacing: '-0.01em',
                  color: 'var(--ink2)',
                  background: 'var(--paper)',
                  border: '1px solid var(--docs-border)',
                  borderRadius: '10px', cursor: 'pointer',
                  transition: 'all 0.15s', outline: 'none',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--docs-border)'; }}
              >
                Browse endpoints
                <ArrowRight size={13} style={{ color: 'var(--ink4)' }} />
              </button>
            </div>

            {/* API Key reveal */}
            <AnimatePresence>
              {apiKey !== 'YOUR_API_KEY' && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: '16px',
                    padding: '14px 18px', borderRadius: '12px',
                    border: '1px solid var(--blueG)',
                    background: 'var(--blueG)',
                    maxWidth: '520px', marginBottom: '28px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <ShieldCheck size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontFamily: "'Syne', system-ui, sans-serif",
                        fontSize: '12px', fontWeight: 600, color: 'var(--blue)', marginBottom: '3px',
                      }}>
                        Sandbox key generated
                      </p>
                      <code style={{
                        fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                        fontSize: '11px', color: 'var(--ink3)',
                        display: 'block', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {apiKey}
                      </code>
                    </div>
                  </div>
                  <CopyButton text={apiKey} id="hero-key" copiedStates={copiedStates} onCopy={copy} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stat chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {[
                { label: '98.2% OCR accuracy', cls: 'docs-chip-green' },
                { label: '<1.2 s avg latency', cls: 'docs-chip-blue' },
                { label: '40+ languages', cls: 'docs-chip-gold' },
                { label: '99.9% uptime SLA', cls: 'docs-chip-purple' },
              ].map((s) => (
                <span key={s.label} className={s.cls} style={{
                  fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                  fontSize: '11px', fontWeight: 500,
                  padding: '5px 12px', borderRadius: '8px',
                }}>
                  {s.label}
                </span>
              ))}
            </div>
            <style>{`
              .docs-chip-green  { color: var(--docs-method-post-clr); background: var(--docs-method-post-bg); border: 1px solid var(--docs-method-post-brd); }
              .docs-chip-blue   { color: var(--docs-method-get-clr);  background: var(--docs-method-get-bg);  border: 1px solid var(--docs-method-get-brd); }
              .docs-chip-gold   { color: var(--blue);  background: var(--blueG);  border: 1px solid var(--blueG); }
              .docs-chip-purple { color: color-mix(in srgb, var(--blue) 60%, var(--blue) 40%); background: var(--blueG); border: 1px solid var(--blueG); }
            `}</style>
          </div>

          {/* ── OVERVIEW ───────────────────────────────────────────── */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="overview" eyebrow="01 — Introduction" label="Overview" refFn={setRef('overview')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              VieTrans is built on the <strong>DeBackX</strong> end-to-end model, a multi-stage translation 
              pipeline that splits the task into text-background separation, discrete visual codebook quantization, 
              direct neural text translation, and seamless final layer fusion — requiring zero external OCR or heuristic font matching.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {[
                { step: '01', icon: '◎', title: 'Background Separation', sub: 'SeparateEncoder', desc: 'Isolates source text layers from complex backgrounds, producing clean background segments.' },
                { step: '02', icon: '⟳', title: 'Visual Quantization', sub: 'Codebook (8192 Size)', desc: 'Encodes and quantizes source visual text features into structured discrete codes representing font and layout.' },
                { step: '03', icon: '◈', title: 'Neural Translation', sub: 'AuxTITTransformer', desc: 'Translates source visual English codes directly into Vietnamese codes, completely bypassing OCR text extraction.' },
                { step: '04', icon: '▣', title: 'Seamless Fusion', sub: 'FuseDecoder', desc: 'Composites the reconstructed target Vietnamese text image back onto the clean backdrop layer seamlessly.' },
              ].map((c) => (
                <div key={c.step} className="docs-pipeline-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '18px', color: 'var(--blue)', opacity: 0.7, lineHeight: 1 }}>{c.icon}</span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700,
                      letterSpacing: '0.14em', textTransform: 'uppercase' as const,
                      color: 'var(--blue)', background: 'var(--blueG)',
                      padding: '2px 8px', borderRadius: '4px',
                      border: '1px solid var(--blueG)',
                    }}>
                      {c.step}
                    </span>
                  </div>
                  <h4 style={{
                    fontFamily: "'Syne', system-ui, sans-serif", fontSize: '14px', fontWeight: 700,
                    color: 'var(--ink)', marginBottom: '4px', letterSpacing: '-0.01em',
                  }}>
                    {c.title}
                  </h4>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--ink4)', marginBottom: '10px' }}>
                    {c.sub}
                  </p>
                  <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '13px', lineHeight: 1.7, color: 'var(--ink3)' }}>
                    {c.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── QUICK START ─────────────────────────────────────────── */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="quick-start" eyebrow="02 — Getting Started" label="Quick Start" refFn={setRef('quick-start')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              Make your first API call in under 60 seconds. The example below sends an image and receives a fully translated output image URL.
            </p>
            <CodeBlock id="quickstart" title="POST /v1/upload" tabs={['curl', 'js', 'python', 'php']}
              snippets={uploadCode} activeTab={codeTabs['quickstart']}
              onTabChange={(tab) => handleTabChange('quickstart', tab)}
              copiedStates={copiedStates} onCopy={copy} />
            <div style={{ marginTop: '14px' }}>
              <ResponseBlock title="Response · 200 OK" status="200 OK" statusColor="green" json={`{
  "matched_id": "vt_res_9f3c02a1e847",
  "status": "done",
  "stages": {
    "input":  "/v1/images/input/vt_res_9f3c02a1e847.png",
    "fuse":   "/v1/images/fuse/vt_res_9f3c02a1e847.png"
  },
  "ocr_confidence": 0.985,
  "translated_regions": 12,
  "processing_ms": 1174
}`} />
            </div>
          </section>

          {/* ── AUTHENTICATION ──────────────────────────────────────── */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="authentication" label="Authentication" refFn={setRef('authentication')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '24px' }}>
              All API requests are authenticated with a secret token passed in the request header. Keep your key private and never expose it in client-side code.
            </p>
            <div style={{ borderRadius: '10px', border: '1px solid var(--docs-border)', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '10px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--docs-border)' }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--ink4)',
                }}>Required Header</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--paper)' }}>
                <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: 'var(--blue)' }}>X-API-Key</code>
                <span style={{ color: 'var(--ink4)', fontSize: '14px' }}>·</span>
                <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--ink3)' }}>{apiKey}</code>
              </div>
            </div>
            <div className="docs-warning-box">
              <ShieldCheck size={15} style={{ color: 'var(--blue)', marginTop: '2px', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.75, color: 'var(--ink3)', margin: 0 }}>
                <strong style={{ color: 'var(--ink2)', fontWeight: 600 }}>Security tip:</strong>{' '}
                Store your API key as an environment variable (e.g.{' '}
                <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', background: 'var(--bg2)', padding: '1px 6px', borderRadius: '4px', color: 'var(--blue)' }}>
                  VT_API_KEY
                </code>
                ) and never commit it to source control.
              </p>
            </div>
          </section>

          {/* ── RATE LIMITS ─────────────────────────────────────────── */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="rate-limits" label="Rate Limits" refFn={setRef('rate-limits')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '24px' }}>
              Response headers expose your current quota window. Implement exponential backoff when you receive a{' '}
              <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', background: 'var(--bg2)', padding: '1px 6px', borderRadius: '4px', color: 'var(--ink2)' }}>429</code>.
            </p>
            <div style={{ borderRadius: '10px', border: '1px solid var(--docs-border)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--docs-border)' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--ink4)' }}>
                  Response Headers
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    { h: 'X-RateLimit-Limit', d: 'Maximum requests allowed in the current window (default: 1 000 / hr).' },
                    { h: 'X-RateLimit-Remaining', d: 'Requests remaining until the window resets.' },
                    { h: 'X-RateLimit-Reset', d: 'Unix timestamp (UTC) when the quota window resets.' },
                  ].map((r, i) => (
                    <tr key={r.h} className="docs-param-row" style={{ borderTop: i > 0 ? '1px solid var(--docs-border)' : 'none' }}>
                      <td style={{ padding: '14px 20px', width: '260px', background: 'var(--paper)' }}>
                        <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: 'var(--blue)' }}>{r.h}</code>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', fontFamily: "'Lora', Georgia, serif", color: 'var(--ink3)', lineHeight: 1.7, background: 'var(--paper)' }}>
                        {r.d}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── API Reference divider ───────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px', paddingTop: '16px' }}>
            <hr className="docs-rule" style={{ flex: 1, margin: 0 }} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px', borderRadius: '999px',
              border: '1px solid var(--blueG)', background: 'var(--blueG)', flexShrink: 0,
            }}>
              <Code2 size={12} style={{ color: 'var(--blue)' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--blue)' }}>
                API Reference
              </span>
            </div>
            <hr className="docs-rule" style={{ flex: 1, margin: 0 }} />
          </div>

          {/* ── PROCESS IMAGE ───────────────────────────────────────── */}
          <section style={{ marginBottom: '72px' }}>
            <EndpointHeader id="upload" method="POST" path="/v1/upload" title="Process Image" refFn={setRef('upload')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              The primary endpoint. Submits an image through the full four-stage DeBackX model: text-background separation, discrete visual codebook quantization, direct neural translation, and seamless layer fusion.
            </p>
            <ParamTable params={[
              { name: 'file', type: 'binary', required: true, description: 'Image file. Accepted: .png, .jpg, .jpeg, .webp. Max size: 10 MB.' },
              { name: 'target_lang', type: 'string', required: true, description: 'ISO-639-1 code for the target language (e.g. vi, en, ja, zh).' },
              { name: 'source_lang', type: 'string', required: false, description: 'Source language code. If omitted, the engine auto-detects the input language.' },
              { name: 'improve_fonts', type: 'boolean', required: false, description: 'Defaults to true. Enables neural font-matching for weight, slant, and scale.' },
            ]} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
              <CodeBlock id="upload" title="Request" tabs={['curl', 'js', 'python', 'php']}
                snippets={uploadCode} activeTab={codeTabs['upload']}
                onTabChange={(tab) => handleTabChange('upload', tab)}
                copiedStates={copiedStates} onCopy={copy} />
              <ResponseBlock title="Response · 200 OK" status="200 OK" statusColor="green" json={`{
  "matched_id": "vt_res_9f3c02a1e847",
  "status": "done",
  "stages": {
    "input": "/v1/images/input/...",
    "fuse":  "/v1/images/fuse/..."
  },
  "ocr_confidence": 0.985,
  "translated_regions": 12,
  "processing_ms": 1174
}`} />
            </div>
          </section>

          {/* ── ERASE & INPAINT ──────────────────────────────────────── */}
          <section style={{ marginBottom: '72px', paddingTop: '40px', borderTop: '1px solid var(--docs-border)' }}>
            <EndpointHeader id="inpainting" method="POST" path="/v1/inpainting" title="Erase & Inpaint Background" refFn={setRef('inpainting')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              Run background reconstruction without translation. Useful for pre-processing images or removing text before manual editing.
            </p>
            <ParamTable params={[
              { name: 'file', type: 'binary', required: true, description: 'Image file. Accepted: .png, .jpg, .jpeg, .webp. Max size: 10 MB.' },
              { name: 'mask_coordinates', type: 'string (JSON)', required: false, description: 'Bounding box array [[x1,y1,x2,y2], …]. If omitted, all detected text regions are erased.' },
            ]} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
              <CodeBlock id="inpainting" title="Request" tabs={['curl', 'js', 'python']}
                snippets={{
                  curl: `curl -X POST https://api.vietrans.com/v1/inpainting \\\n  -H "X-API-Key: ${apiKey}" \\\n  -F "file=@/path/to/image.png"`,
                  js: `const form = new FormData();\nform.append('file', fileInput.files[0]);\n\nconst res = await fetch(\n  'https://api.vietrans.com/v1/inpainting',\n  { method: 'POST', headers: { 'X-API-Key': '${apiKey}' }, body: form }\n);`,
                  python: `resp = requests.post(\n    "https://api.vietrans.com/v1/inpainting",\n    headers={"X-API-Key": "${apiKey}"},\n    files={"file": open("image.png", "rb")},\n)`,
                  php: '',
                }}
                activeTab={codeTabs['inpainting']}
                onTabChange={(tab) => handleTabChange('inpainting', tab)}
                copiedStates={copiedStates} onCopy={copy} />
              <ResponseBlock title="Response · 200 OK" status="200 OK" statusColor="green" json={`{
  "matched_id": "vt_inp_c8d4f2a11092",
  "status": "done",
  "inpainted_url": "/v1/images/fuse/vt_inp_c8d4f2a11092.png"
}`} />
            </div>
          </section>

          {/* ── GET HISTORY ─────────────────────────────────────────── */}
          <section style={{ marginBottom: '72px', paddingTop: '40px', borderTop: '1px solid var(--docs-border)' }}>
            <EndpointHeader id="history" method="GET" path="/v1/history" title="Get Translation History" refFn={setRef('history')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              Retrieve a paginated list of your past translation jobs, ordered by creation date descending.
            </p>
            <ParamTable params={[
              { name: 'page', type: 'integer', required: false, description: 'Page index, 1-indexed. Defaults to 1.' },
              { name: 'limit', type: 'integer', required: false, description: 'Items per page. Defaults to 10. Maximum: 100.' },
            ]} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
              <CodeBlock id="history" title="Request" tabs={['curl', 'js', 'python']}
                snippets={historyCode} activeTab={codeTabs['history']}
                onTabChange={(tab) => handleTabChange('history', tab)}
                copiedStates={copiedStates} onCopy={copy} />
              <ResponseBlock title="Response · 200 OK" status="200 OK" statusColor="green" json={`{
  "data": [
    {
      "id": "vt_res_9f3c02a1e847",
      "created_at": "2026-05-26T12:00:00Z",
      "target_lang": "vi",
      "status": "done"
    }
  ],
  "pagination": { "total": 42, "page": 1, "pages": 5 }
}`} />
            </div>
          </section>

          {/* ── ERROR CODES ─────────────────────────────────────────── */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="errors" label="Error Codes" refFn={setRef('errors')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '24px' }}>
              VieTrans uses standard HTTP status codes. All error responses share this envelope:
            </p>
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(204,51,51,0.2)', background: 'var(--docs-code-bg)', marginBottom: '20px' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(204,51,51,0.12)', background: 'rgba(204,51,51,0.04)' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--ink4)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Error Envelope</span>
              </div>
              <pre className="docs-code-pre">
                <SyntaxHighlight code={`{\n  "error": {\n    "code":    "UNSUPPORTED_LANGUAGE",\n    "message": "Target language 'xx' is not supported.",\n    "status":  422\n  }\n}`} />
              </pre>
            </div>
            <div style={{ borderRadius: '10px', border: '1px solid var(--docs-border)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--docs-border)' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--ink4)' }}>Status Codes</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    { code: '400', name: 'BAD_REQUEST', desc: 'Malformed request body or missing required fields.' },
                    { code: '401', name: 'UNAUTHORIZED', desc: 'Missing, invalid, or expired X-API-Key header.' },
                    { code: '413', name: 'PAYLOAD_TOO_LARGE', desc: 'Image exceeds the 10 MB file-size limit.' },
                    { code: '422', name: 'UNSUPPORTED_LANGUAGE', desc: 'The target_lang code is not in the supported language set.' },
                    { code: '429', name: 'TOO_MANY_REQUESTS', desc: 'Rate limit exceeded. Back off and check X-RateLimit-Reset.' },
                    { code: '500', name: 'INTERNAL_ERROR', desc: 'Unexpected server-side failure. Retry with exponential backoff.' },
                  ].map((r, i) => (
                    <tr key={r.code} className="docs-param-row" style={{ borderTop: i > 0 ? '1px solid var(--docs-border)' : 'none' }}>
                      <td style={{ padding: '12px 20px', width: '64px', background: 'var(--paper)' }}>
                        <code style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700,
                          color: parseInt(r.code) >= 500 ? '#CC3333' : parseInt(r.code) >= 400 ? '#C07828' : 'var(--docs-method-post-clr)',
                        }}>
                          {r.code}
                        </code>
                      </td>
                      <td style={{ padding: '12px 20px', width: '220px', background: 'var(--paper)' }}>
                        <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--ink2)' }}>{r.name}</code>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', fontFamily: "'Lora', Georgia, serif", color: 'var(--ink3)', lineHeight: 1.7, background: 'var(--paper)' }}>
                        {r.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── SDKs ─────────────────────────────────────────────────── */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="sdks" label="SDKs & Libraries" refFn={setRef('sdks')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              Official client libraries wrap the REST API with typed interfaces and automatic retries.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {[
                {
                  icon: '🐍', pkg: 'vietrans-python', ver: 'v1.2.4 · pip',
                  code: `# pip install vietrans-sdk\nfrom vietrans import VieTransClient\n\nclient = VieTransClient(api_key="${apiKey}")\nresult = client.translate(\n    file_path="hero.png",\n    target_lang="vi",\n)\nprint(result.stages.fuse_url)`,
                },
                {
                  icon: '⬡', pkg: '@vietrans/sdk', ver: 'v2.0.1 · npm',
                  code: `// npm install @vietrans/sdk\nimport { VieTrans } from '@vietrans/sdk';\nimport fs from 'fs';\n\nconst vt = new VieTrans({ apiKey: '${apiKey}' });\n\nconst res = await vt.translate({\n  image: fs.createReadStream('hero.png'),\n  targetLang: 'vi',\n});\nconsole.log(res.stages.fuse);`,
                },
              ].map((sdk) => (
                <div key={sdk.pkg} className="docs-code-block">
                  <div className="docs-code-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px' }}>{sdk.icon}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: 'var(--ink2)' }}>{sdk.pkg}</span>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--ink4)' }}>{sdk.ver}</span>
                  </div>
                  <pre className="docs-code-pre" style={{ fontSize: '11.5px' }}>
                    <SyntaxHighlight code={sdk.code} />
                  </pre>
                </div>
              ))}
            </div>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────────── */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeading id="faq" label="FAQ" refFn={setRef('faq')} />
            <div style={{ borderRadius: '12px', border: '1px solid var(--docs-border)', overflow: 'hidden' }}>
              {[
                { q: 'What image formats are supported?', a: 'We support .png, .jpg / .jpeg, and .webp. PNG is recommended for images with transparency or crisp text edges, which improves OCR accuracy and background reconstruction quality.' },
                { q: 'How can I maximize OCR accuracy?', a: 'Provide images with high contrast between text and background, at least 640 × 640 px resolution, and minimal perspective distortion. Avoid heavy JPEG compression artifacts.' },
                { q: 'Can I specify which regions to translate?', a: 'Yes — use the mask_coordinates parameter on the /v1/inpainting endpoint to target specific bounding boxes. The /v1/upload pipeline currently translates all detected text regions automatically.' },
                { q: 'How are custom fonts handled?', a: 'FontMatcher v3 automatically selects from 2 000+ open-source and licensed fonts. Enterprise customers can upload custom corporate font packages via the dashboard.' },
              ].map((item, i, arr) => (
                <FaqItem key={i} q={item.q} a={item.a} isLast={i === arr.length - 1} />
              ))}
            </div>
          </section>

          {/* Footer CTA */}
          <div style={{ marginTop: '64px', paddingTop: '40px', borderTop: '1px solid var(--docs-border)', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
            <div>
              <p style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px', letterSpacing: '-0.01em' }}>
                Need help getting started?
              </p>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '13px', color: 'var(--ink3)' }}>
                Our team is available for integration support and enterprise on-boarding.
              </p>
            </div>
            <a
              href="mailto:support@vietrans.com"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', fontSize: '13px',
                fontFamily: "'Syne', system-ui, sans-serif",
                fontWeight: 600, color: 'var(--blue)',
                border: '1px solid var(--blueG)', background: 'var(--blueG)',
                borderRadius: '10px', textDecoration: 'none', transition: 'all 0.15s', flexShrink: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--blue)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--blueG)'; }}
            >
              <LifeBuoy size={14} />
              Contact support
            </a>
          </div>
        </main>

        {/* Right TOC */}
        <aside
          className="docs-right-toc"
          style={{
            width: '210px', flexShrink: 0,
            position: 'sticky', top: '66px', height: 'calc(100vh - 66px)',
            paddingTop: '48px', paddingLeft: '24px', paddingRight: '20px', overflowY: 'auto',
          }}
        >
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--ink4)', marginBottom: '14px' }}>
            On this page
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {allItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`docs-toc-btn ${active ? 'docs-toc-btn--active' : 'docs-toc-btn--idle'}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div style={{
            marginTop: '32px', padding: '16px', borderRadius: '10px',
            border: '1px solid var(--blueG)', background: 'var(--blueG)',
          }}>
            <p style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px', letterSpacing: '-0.01em' }}>
              Need help?
            </p>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '11px', color: 'var(--ink3)', lineHeight: 1.7, marginBottom: '10px' }}>
              Contact our engineering team for support.
            </p>
            <a href="mailto:support@vietrans.com" style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontFamily: "'Syne', system-ui, sans-serif",
              fontWeight: 600, color: 'var(--blue)', textDecoration: 'none',
            }}>
              support@vietrans.com <ChevronRight size={10} />
            </a>
          </div>
        </aside>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 50 }}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
                background: 'var(--paper)',
                borderRight: '1px solid var(--docs-border)',
                zIndex: 50, display: 'flex', flexDirection: 'column',
                boxShadow: '4px 0 40px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--docs-border)' }}>
                <span style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: '15px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  Documentation
                </span>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  style={{ padding: '6px', borderRadius: '8px', background: 'var(--bg2)', border: '1px solid var(--docs-border)', color: 'var(--ink3)', cursor: 'pointer', outline: 'none' }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>{sidebarContent}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

