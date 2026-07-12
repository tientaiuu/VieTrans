import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Copy, Check, Search, BookOpen, ShieldCheck,
  Menu, X, ChevronRight, HelpCircle, AlertTriangle,
  ArrowRight, Zap, Lock, Activity, Package, LifeBuoy,
  ChevronDown, Globe, Code2,
} from 'lucide-react';
import { generateApiKey, getApiKeyInfo, type ApiKeyInfo } from '../../api';
import { useAppStore } from '../../stores/useAppStore';

// â”€â”€ Google Fonts loader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Syne (display), Lora (body serif), JetBrains Mono (code)
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
  `}</style>
);

// â”€â”€ Scoped CSS for docs â€” uses app CSS variables (--bg, --ink, --gold, etc.) â”€
const DocsCSS = () => (
  <style>{`
    /* â”€â”€ Docs fonts override (scoped to .docs-root) â”€â”€ */
    .docs-root {
      font-family: 'Lora', Georgia, serif;
    }

    /* scrollbar */
    .docs-root ::-webkit-scrollbar { width: 8px; height: 8px; }
    .docs-root ::-webkit-scrollbar-track {
      background: color-mix(in srgb, var(--ink) 4%, transparent);
      border-radius: 99px;
    }
    .docs-root ::-webkit-scrollbar-thumb {
      background: var(--docs-border);
      border-radius: 99px;
    }
    .docs-root ::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--ink) 30%, transparent);
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

    /* Code scanline (subtle â€” darkened in light mode via opacity) */
    @keyframes docs-scanline {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(400%); }
    }
    .docs-code-scanline { position: relative; overflow: hidden; flex: 1; display: flex; flex-direction: column; }
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

    /* Method badges â€” use app theme vars defined in index.css */
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

    /* Code block border â€” gold-tinted in dark, subtle in light */
    .docs-code-block {
      background: var(--docs-code-bg);
      border: 1px solid color-mix(in srgb, var(--blue) 20%, var(--docs-border) 80%);
      border-radius: 12px;
      overflow: hidden;
      box-shadow:
        0 0 0 1px rgba(0,0,0,0.06),
        0 16px 40px rgba(0,0,0,0.10);
      display: flex;
      flex-direction: column;
      height: 100%;
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
      flex: 1;
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
      display: flex;
      flex-direction: column;
      height: 100%;
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
      transition: border-color 0.2s;
      cursor: default;
    }
    .docs-pipeline-card:hover {
      border-color: var(--blue);
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

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Navigation Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      { id: 'background-stage', label: 'Background Stage', method: 'GET' as const },
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

// â”€â”€â”€ Code Snippets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const API_KEY_PLACEHOLDER = 'vt_addxxxxxx';

const getUploadCode = (apiKey: string): Record<LangTab, string> => ({
  curl: `curl -X POST https://masterdzzzz-vietrans-backend.hf.space/api/upload \\
  -H "X-API-Key: ${apiKey}" \\
  -F "file=@/path/to/image.png"

# Then poll the returned poll_url until status is succeeded.
curl "https://masterdzzzz-vietrans-backend.hf.space/api/jobs/YOUR_JOB_ID" \\
  -H "X-API-Key: ${apiKey}"`,
  js: `const form = new FormData();
form.append('file', fileInput.files[0]);

const API_BASE = 'https://masterdzzzz-vietrans-backend.hf.space';
const res = await fetch(API_BASE + '/api/upload', {
  method: 'POST',
  headers: { 'X-API-Key': '${apiKey}' },
  body: form,
});
if (!res.ok) throw new Error(await res.text());

let job = await res.json();
while (job.status !== 'succeeded') {
  if (job.status === 'failed') throw new Error(job.error || 'Upload failed');
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const poll = await fetch(API_BASE + job.poll_url, {
    headers: { 'X-API-Key': '${apiKey}' },
  });
  if (!poll.ok) throw new Error(await poll.text());
  job = await poll.json();
}

console.log(job.result.stages.fuse);`,
  python: `import time
import requests

API_BASE = "https://masterdzzzz-vietrans-backend.hf.space"

resp = requests.post(
    API_BASE + "/api/upload",
    headers={"X-API-Key": "${apiKey}"},
    files={"file": open("image.png", "rb")},
)
resp.raise_for_status()
job = resp.json()

while job["status"] != "succeeded":
    if job["status"] == "failed":
        raise RuntimeError(job.get("error", "Upload failed"))
    time.sleep(1.5)
    poll = requests.get(
        API_BASE + job["poll_url"],
        headers={"X-API-Key": "${apiKey}"},
    )
    poll.raise_for_status()
    job = poll.json()

print(job["result"]["stages"]["fuse"])`,
  php: `<?php
$apiBase = 'https://masterdzzzz-vietrans-backend.hf.space';
$curl = curl_init($apiBase . '/api/upload');
curl_setopt_array($curl, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['X-API-Key: ${apiKey}'],
  CURLOPT_POSTFIELDS => [
    'file' => new CURLFile('/path/to/image.png'),
  ],
]);
$job = json_decode(curl_exec($curl), true);
curl_close($curl);

while ($job['status'] !== 'succeeded') {
  if ($job['status'] === 'failed') {
    throw new Exception($job['error'] ?? 'Upload failed');
  }
  sleep(2);
  $poll = curl_init($apiBase . $job['poll_url']);
  curl_setopt_array($poll, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['X-API-Key: ${apiKey}'],
  ]);
  $job = json_decode(curl_exec($poll), true);
  curl_close($poll);
}

echo $job['result']['stages']['fuse'];`,
});

const getHistoryCode = (apiKey: string): Record<LangTab, string> => ({
  curl: `curl "https://masterdzzzz-vietrans-backend.hf.space/api/history" \\
  -H "X-API-Key: ${apiKey}"`,
  js: `const res = await fetch(
  'https://masterdzzzz-vietrans-backend.hf.space/api/history',
  { headers: { 'X-API-Key': '${apiKey}' } }
);
const histories = await res.json();`,
  python: `resp = requests.get(
    "https://masterdzzzz-vietrans-backend.hf.space/api/history",
    headers={"X-API-Key": "${apiKey}"},
)`,
  php: `<?php
$url = 'https://masterdzzzz-vietrans-backend.hf.space/api/history';
$curl = curl_init($url);
curl_setopt($curl, CURLOPT_HTTPHEADER, ['X-API-Key: ${apiKey}']);
echo curl_exec($curl);`,
});

// â”€â”€â”€ Syntax Highlight (theme-aware colors via inline) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// String/number tokens use relative opacity so they look ok on both themes
const SyntaxHighlight: React.FC<{ code: string }> = ({ code }) => {
  // Split the code using a regex that captures all token types.
  // Capturing groups:
  // Group 1: Comment (starts with # or //)
  // Group 2: String (double quotes, single quotes, backticks)
  // Group 3: Keyword
  // Group 4: Flag (starting with - or --)
  // Group 5: Built-in function
  // Group 6: Number
  const tokenRegex = /(#[^\n]*|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(?:import|from|const|let|await|async|new|echo|function|return|true|false|null|undefined|class|print)\b)|(\s-{1,2}[\w-]+)|(\b(?:curl_init|curl_setopt_array|curl_setopt|curl_exec|CURLOPT_\w+|FormData|fetch|console\.log|requests|open)\b)|(\b\d+\b)/g;

  const parts = code.split(tokenRegex);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const type = i % 7;
    if (type === 0) {
      elements.push(part);
    } else if (type === 1) {
      elements.push(<span key={i} className="docs-hl-cmt">{part}</span>);
    } else if (type === 2) {
      elements.push(<span key={i} className="docs-hl-str">{part}</span>);
    } else if (type === 3) {
      elements.push(<span key={i} className="docs-hl-kw">{part}</span>);
    } else if (type === 4) {
      elements.push(<span key={i} className="docs-hl-flag">{part}</span>);
    } else if (type === 5) {
      elements.push(<span key={i} className="docs-hl-fn">{part}</span>);
    } else if (type === 6) {
      elements.push(<span key={i} className="docs-hl-num">{part}</span>);
    }
  }

  return <code>{elements}</code>;
};

// Syntax highlight CSS â€” strings/keys = blue accent, funcs = blue2, keywords = muted red
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

// â”€â”€â”€ Method Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MethodBadge: React.FC<{ method: 'GET' | 'POST' }> = ({ method }) => (
  <span
    className={`inline-flex items-center justify-center font-mono text-[9px] font-bold rounded uppercase ${
      method === 'POST' ? 'docs-badge-post' : 'docs-badge-get'
    }`}
    style={{
      fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
      width: '42px',
      height: '18px',
      lineHeight: 1,
      letterSpacing: '0.03em',
      flexShrink: 0,
    }}
  >
    {method}
  </span>
);

// â”€â”€â”€ Copy Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Code Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Response Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      <div className="docs-code-scanline" style={{ position: 'relative' }}>
        <pre className="docs-code-pre">
          <SyntaxHighlight code={json} />
        </pre>
      </div>
    </div>
  );
};

// â”€â”€â”€ Section Heading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Endpoint Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Param Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Sidebar Link â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ FAQ Item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

const PythonIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: 'block' }}>
    <path fill="#3776AB" d="M12.12 1.5c-1.35 0-2.52.12-3.17.38-.85.35-1.44.97-1.44 2.1v2.02h4.7v.52H6.42A2.88 2.88 0 0 0 3.53 9.4c0 1.55.15 2.76.6 3.4.45.65 1.25.75 2.3.75h1.22v-1.62c0-1 .5-1.5 1.5-1.5h4.7c1 0 1.5-.5 1.5-1.5v-4.7c0-1-.5-1.5-1.5-1.5H12.12zm-2.02 1.62a.62.62 0 1 1 0 1.25.62.62 0 0 1 0-1.25z"/>
    <path fill="#FFE873" d="M11.88 22.5c1.35 0 2.52-.12 3.17-.38.85-.35 1.44-.97 1.44-2.1v-2.02H11.8v-.52h5.78A2.88 2.88 0 0 0 20.47 14.6c0-1.55-.15-2.76-.6-3.4-.45-.65-1.25-.75-2.3-.75h-1.22v1.62c0 1-.5 1.5-1.5 1.5h-4.7c-1 0-1.5.5-1.5 1.5v4.7c0 1 .5 1.5 1.5 1.5h1.75zm2.02-1.62a.62.62 0 1 1 0-1.25.62.62 0 0 1 0 1.25z"/>
  </svg>
);

const JavaScriptIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: 'block', borderRadius: '2px', background: '#F7DF1E' }}>
    <path fill="#000" d="M2 2h20v20H2z" style={{ fill: '#F7DF1E' }} />
    <path fill="#000" d="M18.8 17.2c-.3-.8-.9-1.2-1.8-1.2-1 0-1.5.6-1.5 1.6 0 1 .5 1.5 1.6 1.5.8 0 1.3-.4 1.6-1.1l1.5.9c-.6 1.2-1.7 2-3.1 2-2.3 0-3.8-1.5-3.8-3.8 0-2.3 1.5-3.8 3.8-3.8 1.8 0 3 1 3.5 2.5l-1.8 1.4zm-7.7.9c.2.6.6.9 1.1.9.5 0 .8-.2.8-.7 0-.5-.3-.7-.9-1l-.6-.3c-1.3-.6-1.9-1.3-1.9-2.6 0-1.6 1.3-2.6 3.1-2.6 1.6 0 2.7.8 3.1 2.2l-1.8.9c-.3-.6-.6-.9-1.1-.9-.4 0-.7.2-.7.6 0 .4.3.6.9.9l.6.3c1.4.6 2 1.3 2 2.7 0 1.8-1.4 2.8-3.3 2.8-2 0-3-1.1-3.4-2.5l1.6-.7z"/>
  </svg>
);

// â”€â”€â”€ Main DocsPage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const DocsPage: React.FC = () => {
  const { isLoggedIn, token, openAuth } = useAppStore();
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [apiKeyError, setApiKeyError] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [codeTabs, setCodeTabs] = useState<Record<string, LangTab>>({
    quickstart: 'curl',
    upload: 'curl',
    'background-stage': 'curl',
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

  useEffect(() => {
    let cancelled = false;
    setApiKey('');
    setApiKeyError('');

    if (!token) {
      setApiKeyInfo(null);
      return () => { cancelled = true; };
    }

    getApiKeyInfo(token)
      .then((info) => {
        if (!cancelled) setApiKeyInfo(info);
      })
      .catch((err) => {
        if (!cancelled) {
          setApiKeyInfo(null);
          setApiKeyError(err instanceof Error ? err.message : 'Failed to load API key');
        }
      });

    return () => { cancelled = true; };
  }, [token]);

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

  const handleGenerateKey = async () => {
    if (!isLoggedIn || !token) {
      setApiKeyError('Sign in to generate an API key.');
      openAuth();
      return;
    }

    setIsGeneratingKey(true);
    setApiKeyError('');
    try {
      const result = await generateApiKey(token);
      setApiKey(result.apiKey);
      setApiKeyInfo(result);
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : 'Failed to generate API key');
    } finally {
      setIsGeneratingKey(false);
    }
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

  const apiKeyForSnippets = API_KEY_PLACEHOLDER;
  const visibleApiKey = apiKey || (
    apiKeyInfo?.hasKey && apiKeyInfo.lastFour
      ? `vt_live_...${apiKeyInfo.lastFour}`
      : API_KEY_PLACEHOLDER
  );
  const hasApiKey = Boolean(apiKey || apiKeyInfo?.hasKey);
  const uploadCode = getUploadCode(apiKeyForSnippets);
  const historyCode = getHistoryCode(apiKeyForSnippets);

  // â”€â”€ Sidebar content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            placeholder="Search docs..."
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

      {/* â”€â”€ Mobile top bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ Three-column layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

          {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  API v1 / REST
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
              A REST upload endpoint runs the current image translation pipeline: OCR, translation,
              text removal, and rendering the Vietnamese result back onto the image.
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
                    Generating...
                  </>
                ) : (
                  <>
                    <Key size={14} />
                    {!token ? 'Sign in for API Key' : hasApiKey ? 'Regenerate Key' : 'Get your API Key'}
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
              {apiKeyError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  style={{
                    padding: '12px 16px', borderRadius: '10px',
                    border: '1px solid rgba(204,51,51,0.22)',
                    background: 'rgba(204,51,51,0.08)',
                    color: '#CC3333',
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '13px',
                    maxWidth: '520px', marginBottom: '16px',
                  }}
                >
                  {apiKeyError}
                </motion.div>
              )}
              {hasApiKey && (
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
                        {apiKey ? 'Live API key generated' : 'Live API key active'}
                      </p>
                      <code style={{
                        fontFamily: "'JetBrains Mono', 'Space Mono', monospace",
                        fontSize: '11px', color: 'var(--ink3)',
                        display: 'block', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {visibleApiKey}
                      </code>
                    </div>
                  </div>
                  {apiKey ? (
                    <CopyButton text={apiKey} id="hero-key" copiedStates={copiedStates} onCopy={copy} />
                  ) : (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px',
                      color: 'var(--ink4)',
                      whiteSpace: 'nowrap',
                    }}>
                      Regenerate to reveal
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stat chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {[
                { label: 'OCR + NLLB pipeline', cls: 'docs-chip-green' },
                { label: 'Image stage outputs', cls: 'docs-chip-blue' },
                { label: 'EN to VI workflow', cls: 'docs-chip-gold' },
                { label: 'Layout-aware rendering', cls: 'docs-chip-purple' },
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

          {/* â”€â”€ OVERVIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="overview" eyebrow="01 - Introduction" label="Overview" refFn={setRef('overview')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              VieTrans is built on the <strong>VieTrans</strong> end-to-end model, a multi-stage translation 
              pipeline that splits the task into text-background separation, discrete visual codebook quantization, 
              direct neural text translation, and seamless final layer fusion - requiring zero external OCR or heuristic font matching.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { step: '01', icon: 'BG', title: 'Background Separation', sub: 'OCR/Layout analyzer', desc: 'Isolates source text layers from complex backgrounds, producing clean background segments.' },
                { step: '02', icon: 'VQ', title: 'Visual Quantization', sub: 'Layout blocks (8192 Size)', desc: 'Encodes and quantizes source visual text features into structured discrete codes representing font and layout.' },
                { step: '03', icon: 'NT', title: 'Neural Translation', sub: 'NLLB translator', desc: 'Translates source visual English codes directly into Vietnamese codes, completely bypassing OCR text extraction.' },
                { step: '04', icon: 'FX', title: 'Seamless Fusion', sub: 'Render planner', desc: 'Composites the reconstructed target Vietnamese text image back onto the clean backdrop layer seamlessly.' },
              ].map((c) => (
                <div key={c.step} className="docs-pipeline-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--blue)',
                      opacity: 0.8,
                      lineHeight: 1,
                    }}>{c.icon}</span>
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

          {/* â”€â”€ QUICK START â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="quick-start" eyebrow="02 - Getting Started" label="Quick Start" refFn={setRef('quick-start')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              Make your first API call by submitting an image job, polling until it finishes, and then reading the translated output image URL.
            </p>
            <CodeBlock id="quickstart" title="POST /api/upload" tabs={['curl', 'js', 'python', 'php']}
              snippets={uploadCode} activeTab={codeTabs['quickstart']}
              onTabChange={(tab) => handleTabChange('quickstart', tab)}
              copiedStates={copiedStates} onCopy={copy} />
            <div style={{ marginTop: '14px' }}>
              <ResponseBlock title="Response - 202 Accepted" status="202 Accepted" statusColor="green" json={`{
  "job_id": "0c4a1f5e-93ef-41fa-9de5-ec2af60e4b72",
  "sample_id": "b5f2f5f2-0a89-4c55-8d6f-7f09e2d92c32",
  "matched_id": "b5f2f5f2-0a89-4c55-8d6f-7f09e2d92c32",
  "status": "queued",
  "poll_url": "/api/jobs/0c4a1f5e-93ef-41fa-9de5-ec2af60e4b72",
  "edit_token": "one-time-edit-token"
}`} />
            </div>
          </section>

          {/* â”€â”€ AUTHENTICATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="authentication" label="Authentication" refFn={setRef('authentication')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '24px' }}>
              External API requests can use your account API key in the request header. Keep your key private and never expose it in client-side code.
            </p>
            <div style={{ borderRadius: '10px', border: '1px solid var(--docs-border)', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '10px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--docs-border)' }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--ink4)',
                }}>API Header</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--paper)' }}>
                <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: 'var(--blue)' }}>X-API-Key</code>
                <span style={{ color: 'var(--ink4)', fontSize: '14px' }}>|</span>
                <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--ink3)' }}>{visibleApiKey}</code>
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
                ) and never commit it to source control. Existing keys are masked after creation; regenerate only when you are ready to replace the old one.
              </p>
            </div>
          </section>

          {/* â”€â”€ RATE LIMITS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="rate-limits" label="Rate Limits" refFn={setRef('rate-limits')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '24px' }}>
              Upload and auth endpoints are rate-limited per client and path. Implement exponential backoff when you receive a{' '}
              <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', background: 'var(--bg2)', padding: '1px 6px', borderRadius: '4px', color: 'var(--ink2)' }}>429</code>.
            </p>
            <div style={{ borderRadius: '10px', border: '1px solid var(--docs-border)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--docs-border)' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--ink4)' }}>
                  Defaults
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    { h: 'Window', d: 'Default rate-limit window is 60 seconds.' },
                    { h: 'Limit', d: 'Default limit is 30 requests per client/path in the active window.' },
                    { h: 'Scope', d: 'Applied to upload, edit, login, register, password reset, and API-key endpoints.' },
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

          {/* â”€â”€ API Reference divider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

          {/* â”€â”€ PROCESS IMAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section style={{ marginBottom: '72px' }}>
            <EndpointHeader id="upload" method="POST" path="/api/upload" title="Process Image" refFn={setRef('upload')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              The primary endpoint. It queues an image for the full VieTrans model pipeline, then returns a job id that clients poll until the translated result is ready.
            </p>
            <ParamTable params={[
              { name: 'file', type: 'binary', required: true, description: 'Image file. Accepted: .png, .jpg, .jpeg, .webp. Max size: 10 MB.' },
            ]} />
            <div className="flex flex-col gap-4">
              <CodeBlock id="upload" title="Request" tabs={['curl', 'js', 'python', 'php']}
                snippets={uploadCode} activeTab={codeTabs['upload']}
                onTabChange={(tab) => handleTabChange('upload', tab)}
                copiedStates={copiedStates} onCopy={copy} />
              <ResponseBlock title="Response - 202 Accepted" status="202 Accepted" statusColor="green" json={`{
  "job_id": "0c4a1f5e-93ef-41fa-9de5-ec2af60e4b72",
  "sample_id": "b5f2f5f2-0a89-4c55-8d6f-7f09e2d92c32",
  "matched_id": "b5f2f5f2-0a89-4c55-8d6f-7f09e2d92c32",
  "status": "queued",
  "poll_url": "/api/jobs/0c4a1f5e-93ef-41fa-9de5-ec2af60e4b72",
  "edit_token": "one-time-edit-token"
}`} />
            </div>
          </section>

          {/* â”€â”€ ERASE & INPAINT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section style={{ marginBottom: '72px', paddingTop: '40px', borderTop: '1px solid var(--docs-border)' }}>
            <EndpointHeader id="background-stage" method="GET" path="/api/images/back/{sample_id}" title="Get Inpainted Background" refFn={setRef('background-stage')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              The API exposes the inpainted background as a pipeline artifact after the upload job succeeds. Use the <code>result.stages.back</code> URL from the completed job response to fetch the cleaned background image.
            </p>
            <ParamTable params={[
              { name: 'sample_id', type: 'string', required: true, description: 'The matched_id/sample_id returned by the completed upload job.' },
              { name: 'stage', type: 'string', required: true, description: 'Use back for the inpainted background, or input, text_en, text_vi, fuse for other artifacts.' },
            ]} />
            <div className="flex flex-col gap-4">
              <CodeBlock id="background-stage" title="Request" tabs={['curl', 'js', 'python']}
                snippets={{
                  curl: `curl "https://masterdzzzz-vietrans-backend.hf.space/api/images/back/YOUR_SAMPLE_ID"`,
                  js: `const res = await fetch(\n  'https://masterdzzzz-vietrans-backend.hf.space/api/images/back/YOUR_SAMPLE_ID'\n);\nconst blob = await res.blob();`,
                  python: `resp = requests.get(\n    "https://masterdzzzz-vietrans-backend.hf.space/api/images/back/YOUR_SAMPLE_ID"\n)\nresp.raise_for_status()`,
                  php: '',
                }}
                activeTab={codeTabs['background-stage']}
                onTabChange={(tab) => handleTabChange('background-stage', tab)}
                copiedStates={copiedStates} onCopy={copy} />
              <ResponseBlock title="Completed job response excerpt" status="200 OK" statusColor="green" json={`{
  "status": "succeeded",
  "result": {
  "matched_id": "b5f2f5f2-0a89-4c55-8d6f-7f09e2d92c32",
  "stages": {
    "back": "/api/images/back/b5f2f5f2-0a89-4c55-8d6f-7f09e2d92c32",
    "fuse": "/api/images/fuse/b5f2f5f2-0a89-4c55-8d6f-7f09e2d92c32"
  }
  }
}`} />
            </div>
          </section>

          {/* â”€â”€ GET HISTORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section style={{ marginBottom: '72px', paddingTop: '40px', borderTop: '1px solid var(--docs-border)' }}>
            <EndpointHeader id="history" method="GET" path="/api/history" title="Get Translation History" refFn={setRef('history')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              Retrieve your past translation jobs, ordered by creation date descending. You can optionally filter by a local calendar date.
            </p>
            <ParamTable params={[
              { name: 'date', type: 'string', required: false, description: 'Local date filter in YYYY-MM-DD format.' },
              { name: 'tz_offset_minutes', type: 'integer', required: false, description: 'Client timezone offset from Date.getTimezoneOffset(). Defaults to 0.' },
            ]} />
            <div className="flex flex-col gap-4">
              <CodeBlock id="history" title="Request" tabs={['curl', 'js', 'python']}
                snippets={historyCode} activeTab={codeTabs['history']}
                onTabChange={(tab) => handleTabChange('history', tab)}
                copiedStates={copiedStates} onCopy={copy} />
              <ResponseBlock title="Response - 200 OK" status="200 OK" statusColor="green" json={`{
  "histories": [
    {
      "id": "b5f2f5f2-0a89-4c55-8d6f-7f09e2d92c32",
      "created_at": "2026-05-26T12:00:00Z",
      "tit": "Xin chao",
      "ocr": "Hello",
      "stages": {
        "fuse": "/api/images/fuse/b5f2f5f2-0a89-4c55-8d6f-7f09e2d92c32"
      }
    }
  ]
}`} />
            </div>
          </section>

          {/* â”€â”€ ERROR CODES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    { code: '401', name: 'UNAUTHORIZED', desc: 'Invalid API key or missing credentials on protected endpoints.' },
                    { code: '413', name: 'PAYLOAD_TOO_LARGE', desc: 'Image exceeds the 10 MB file-size limit.' },
                    { code: '422', name: 'UNSUPPORTED_LANGUAGE', desc: 'The target_lang code is not in the supported language set.' },
                    { code: '429', name: 'TOO_MANY_REQUESTS', desc: 'Rate limit exceeded. Back off before retrying the same endpoint.' },
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

          {/* â”€â”€ REST Examples â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section style={{ marginBottom: '72px' }}>
            <SectionHeading id="sdks" label="REST Examples" refFn={setRef('sdks')} />
            <p style={{ fontSize: '15px', fontFamily: "'Lora', Georgia, serif", lineHeight: 1.85, color: 'var(--ink3)', marginBottom: '28px' }}>
              Use the REST endpoint directly from your app or automation. Official SDK packages are not published yet.
            </p>
            <div className="flex flex-col gap-4">
              {[
                {
                  icon: <PythonIcon />, pkg: 'Python requests', ver: 'REST upload',
                  code: `import time\nimport requests\n\nAPI_BASE = "https://your-api.example.com"\n\nwith open("hero.png", "rb") as f:\n    res = requests.post(\n        API_BASE + "/api/upload",\n        files={"file": f},\n        headers={"X-API-Key": "${apiKeyForSnippets}"},\n    )\nres.raise_for_status()\njob = res.json()\n\nwhile job["status"] != "succeeded":\n    if job["status"] == "failed":\n        raise RuntimeError(job.get("error", "Upload failed"))\n    time.sleep(1.5)\n    job = requests.get(\n        API_BASE + job["poll_url"],\n        headers={"X-API-Key": "${apiKeyForSnippets}"},\n    ).json()\n\nprint(job["result"]["stages"]["fuse"])`,
                },
                {
                  icon: <JavaScriptIcon />, pkg: 'JavaScript fetch', ver: 'REST upload',
                  code: `const API_BASE = "https://your-api.example.com";\nconst form = new FormData();\nform.append("file", fileInput.files[0]);\n\nconst res = await fetch(API_BASE + "/api/upload", {\n  method: "POST",\n  headers: { "X-API-Key": "${apiKeyForSnippets}" },\n  body: form,\n});\n\nif (!res.ok) throw new Error(await res.text());\nlet job = await res.json();\n\nwhile (job.status !== "succeeded") {\n  if (job.status === "failed") throw new Error(job.error || "Upload failed");\n  await new Promise((resolve) => setTimeout(resolve, 1500));\n  const poll = await fetch(API_BASE + job.poll_url, {\n    headers: { "X-API-Key": "${apiKeyForSnippets}" },\n  });\n  job = await poll.json();\n}\n\nconsole.log(job.result.stages.fuse);`,
                },
              ].map((sdk) => (
                <div key={sdk.pkg} className="docs-code-block">
                  <div className="docs-code-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {sdk.icon}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: 'var(--ink2)' }}>{sdk.pkg}</span>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--ink4)' }}>{sdk.ver}</span>
                  </div>
                  <div className="docs-code-scanline" style={{ position: 'relative' }}>
                    <pre className="docs-code-pre" style={{ fontSize: '11.5px', flex: 1 }}>
                      <SyntaxHighlight code={sdk.code} />
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* â”€â”€ FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <section style={{ marginBottom: '48px' }}>
            <SectionHeading id="faq" label="FAQ" refFn={setRef('faq')} />
            <div style={{ borderRadius: '12px', border: '1px solid var(--docs-border)', overflow: 'hidden' }}>
              {[
                { q: 'What image formats are supported?', a: 'We support .png, .jpg / .jpeg, and .webp. PNG is recommended for images with transparency or crisp text edges, which improves OCR accuracy and background reconstruction quality.' },
                { q: 'How can I maximize OCR accuracy?', a: 'Provide images with high contrast between text and background, at least 640 x 640 px resolution, and minimal perspective distortion. Avoid heavy JPEG compression artifacts.' },
                { q: 'Can I specify which regions to translate?', a: 'Region-level selection is not exposed in the public API yet. The /api/upload pipeline currently translates all detected text regions automatically and returns intermediate stage images for review.' },
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

