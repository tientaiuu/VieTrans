/**
 * DebackX API Client
 * Communicates with the FastAPI backend at localhost:8000
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PipelineStages {
  input: string;
  back: string;
  text_en: string;
  text_vi: string;
  fuse: string;
}

export interface SampleDetail {
  id: number | string;
  tit: string;
  ocr: string;
  stages: PipelineStages;
}

export interface SampleListItem {
  id: number | string;
  tit: string;
  ocr: string;
}

export interface SamplesPage {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  samples: SampleListItem[];
}

export interface UploadResult {
  matched_id: number | string;
  match_quality: 'good' | 'approximate' | 'random' | 'live_inference';
  hamming_distance: number;
  tit: string;
  ocr: string;
  stages: PipelineStages;
}

export interface PipelineInfo {
  total_samples: number;
  stages: { key: string; name: string; name_en: string }[];
  models: Record<string, Record<string, unknown>>;
  image_size: { width: number; height: number };
}

// ─── API Functions ──────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; total_samples: number }> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Backend unavailable');
  return res.json();
}

export async function getPipelineInfo(): Promise<PipelineInfo> {
  const res = await fetch(`${API_BASE}/api/pipeline-info`);
  if (!res.ok) throw new Error('Failed to fetch pipeline info');
  return res.json();
}

export async function listSamples(page = 1, limit = 20): Promise<SamplesPage> {
  const res = await fetch(`${API_BASE}/api/samples?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch samples');
  return res.json();
}

export async function getSample(id: number | string): Promise<SampleDetail> {
  const res = await fetch(`${API_BASE}/api/samples/${id}`);
  if (!res.ok) throw new Error(`Sample ${id} not found`);
  return res.json();
}

export async function getRandomSample(): Promise<SampleDetail> {
  const res = await fetch(`${API_BASE}/api/random`);
  if (!res.ok) throw new Error('Failed to fetch random sample');
  return res.json();
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

/** Build full image URL from API path */
export function imageUrl(apiPath: string): string {
  return `${API_BASE}${apiPath}`;
}

/** Build thumbnail URL */
export function thumbUrl(stage: string, id: number | string): string {
  return `${API_BASE}/api/images/thumb/${stage}/${id}`;
}
