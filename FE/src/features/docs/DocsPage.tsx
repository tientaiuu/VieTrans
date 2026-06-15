import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Code2,
  Database,
  Download,
  FileText,
  ImageIcon,
  Server,
  ShieldCheck,
  Upload,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/health',
    title: 'Gateway and worker health',
    desc: 'Checks the VieTrans gateway and reports whether the configured DebackX worker is reachable.',
  },
  {
    method: 'GET',
    path: '/api/pipeline-info',
    title: 'Pipeline metadata',
    desc: 'Returns the OCR, translation, mask, render stages and measured metrics currently exposed by the gateway.',
  },
  {
    method: 'POST',
    path: '/api/upload',
    title: 'Translate an image',
    desc: 'Accepts a multipart image field named file, forwards it to the DebackX worker, and stores normalized job metadata.',
  },
  {
    method: 'GET',
    path: '/api/jobs/{job_id}',
    title: 'Read a cached job',
    desc: 'Returns normalized OCR text, Vietnamese translation, latency, regions, and image URLs for one job.',
  },
  {
    method: 'GET',
    path: '/api/images/result/{job_id}',
    title: 'Translated image',
    desc: 'Streams the final rendered image from the DebackX worker through the gateway.',
  },
  {
    method: 'GET',
    path: '/api/download/result/{job_id}',
    title: 'Download converted output',
    desc: 'Downloads the translated image as jpg, png, or webp with a custom filename.',
  },
];

const RESPONSE_EXAMPLE = `{
  "id": "job_id_from_worker",
  "status": "completed",
  "mode": "live_inference",
  "match_quality": "live_inference",
  "ocr": "recognized English text",
  "tit": "bản dịch tiếng Việt",
  "num_regions": 0,
  "avg_confidence": null,
  "latency_ms": null,
  "stages": {
    "input": "/api/images/input/job_id_from_worker",
    "result": "/api/images/result/job_id_from_worker",
    "mask": "/api/images/mask/job_id_from_worker",
    "metadata": "/api/images/metadata/job_id_from_worker"
  }
}`;

const CURL_EXAMPLE = `curl -X POST "${API_BASE}/api/upload" \\
  -F "file=@/path/to/image.png"`;

const ENV_EXAMPLE = `VITE_API_URL=http://localhost:8000
IIMT_WORKER_URL=http://localhost:8081
IIMT_WORKER_TIMEOUT_SECONDS=300
VIETRANS_MAX_UPLOAD_MB=20
AUTH_ENABLED=true`;

const sectionStyle: React.CSSProperties = {
  border: '1px solid var(--ln)',
  background: 'var(--paper)',
  borderRadius: 12,
  padding: 24,
};

export const DocsPage: React.FC = () => {
  return (
    <div style={{ paddingTop: 66, minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '42px 20px 72px' }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 24, alignItems: 'stretch' }}>
          <div style={{ ...sectionStyle, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--blue)', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
              <Server size={18} />
              DEBACKX GATEWAY API
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(34px, 6vw, 64px)', lineHeight: 0.98, letterSpacing: 0 }}>
              Image translation API for the VieTrans web app.
            </h1>
            <p style={{ margin: 0, color: 'var(--ink3)', fontSize: 16, lineHeight: 1.7, maxWidth: 760 }}>
              The frontend calls this lightweight FastAPI gateway. The gateway forwards uploaded
              images to the DebackX worker, stores job metadata, and proxies generated result images.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Link to="/studio" className="btn-primary">Open Studio</Link>
              <a href={`${API_BASE}/api/health`} className="btn-secondary">Health Check</a>
            </div>
          </div>

          <div style={{ ...sectionStyle, display: 'grid', gap: 14 }}>
            {[
              { icon: <Upload size={18} />, label: 'Input', value: 'multipart image upload' },
              { icon: <Activity size={18} />, label: 'Runtime', value: 'FastAPI gateway + DebackX worker' },
              { icon: <ImageIcon size={18} />, label: 'Outputs', value: 'input, result, mask, metadata' },
              { icon: <ShieldCheck size={18} />, label: 'Auth', value: 'optional Bearer token for history' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'center' }}>
                <span style={{ color: 'var(--blue)' }}>{item.icon}</span>
                <span>
                  <div style={{ fontSize: 12, color: 'var(--ink4)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: 14, color: 'var(--ink2)' }}>{item.value}</div>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 24, ...sectionStyle }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Code2 size={20} color="var(--blue)" />
            <h2 style={{ margin: 0, fontSize: 24 }}>Quick Upload</h2>
          </div>
          <pre style={{ margin: 0, overflowX: 'auto', padding: 18, borderRadius: 8, background: 'var(--bg2)', color: 'var(--ink2)', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.7 }}>
            {CURL_EXAMPLE}
          </pre>
        </section>

        <section style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {ENDPOINTS.map((endpoint) => (
            <article key={`${endpoint.method}-${endpoint.path}`} style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: endpoint.method === 'POST' ? 'rgba(34,197,94,0.12)' : 'var(--blueG)',
                  color: endpoint.method === 'POST' ? '#16a34a' : 'var(--blue)',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  fontWeight: 800,
                }}>
                  {endpoint.method}
                </span>
                <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink3)' }}>{endpoint.path}</code>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{endpoint.title}</h3>
              <p style={{ margin: 0, color: 'var(--ink4)', lineHeight: 1.6, fontSize: 14 }}>{endpoint.desc}</p>
            </article>
          ))}
        </section>

        <section style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <FileText size={20} color="var(--blue)" />
              <h2 style={{ margin: 0, fontSize: 22 }}>Upload Response</h2>
            </div>
            <pre style={{ margin: 0, overflowX: 'auto', padding: 18, borderRadius: 8, background: 'var(--bg2)', color: 'var(--ink2)', fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.7 }}>
              {RESPONSE_EXAMPLE}
            </pre>
          </div>

          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Database size={20} color="var(--blue)" />
              <h2 style={{ margin: 0, fontSize: 22 }}>Environment</h2>
            </div>
            <pre style={{ margin: 0, overflowX: 'auto', padding: 18, borderRadius: 8, background: 'var(--bg2)', color: 'var(--ink2)', fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.7 }}>
              {ENV_EXAMPLE}
            </pre>
            <p style={{ margin: '16px 0 0', color: 'var(--ink4)', lineHeight: 1.6, fontSize: 14 }}>
              Put the model and PaddleOCR stack in DebackX. Keep this backend small so the web
              project can run as a normal service and call the worker over HTTP.
            </p>
          </div>
        </section>

        <section style={{ marginTop: 24, ...sectionStyle }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Download size={20} color="var(--blue)" />
            <h2 style={{ margin: 0, fontSize: 22 }}>History and Downloads</h2>
          </div>
          <p style={{ margin: 0, color: 'var(--ink3)', lineHeight: 1.7 }}>
            If a user sends a Bearer token to <code>/api/upload</code>, the gateway saves the job
            to MongoDB history. The dashboard then reads <code>/api/history</code> and opens
            <code>/api/images/result/{'{job_id}'}</code> or <code>/api/download/result/{'{job_id}'}</code>
            for the translated image.
          </p>
        </section>
      </main>
    </div>
  );
};

export default DocsPage;
