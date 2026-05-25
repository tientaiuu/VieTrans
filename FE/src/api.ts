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

export async function uploadImage(file: File, token?: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function updateFuseImage(sampleId: string | number, imageData: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/update-fuse/${sampleId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_data: imageData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Update failed' }));
    throw new Error(err.detail || 'Update failed');
  }
}

export interface HistoryItem {
  id: string;
  tit: string;
  ocr: string;
  stages: PipelineStages;
  created_at: string;
}

export async function getHistory(
  token: string,
  options?: { date?: string; tzOffsetMinutes?: number }
): Promise<HistoryItem[]> {
  const params = new URLSearchParams();
  if (options?.date) {
    params.set('date', options.date);
  }
  if (typeof options?.tzOffsetMinutes === 'number') {
    params.set('tz_offset_minutes', String(options.tzOffsetMinutes));
  }

  const query = params.toString();
  const res = await fetch(`${API_BASE}/api/history${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch history');
  const data = await res.json();
  return data.histories || [];
}

export async function deleteHistory(sampleId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/history/${sampleId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete history');
}

/** Build full image URL from API path */
export function imageUrl(apiPath: string): string {
  return `${API_BASE}${apiPath}`;
}

/** Build thumbnail URL */
export function thumbUrl(stage: string, id: number | string): string {
  return `${API_BASE}/api/images/thumb/${stage}/${id}`;
}

/** Download an image from the API with custom filename and format */
export function buildDownloadUrl(
  stage: string,
  sampleId: string | number,
  filename: string,
  format: 'jpg' | 'png' | 'webp'
): string {
  const params = new URLSearchParams({ filename, format });
  return `${API_BASE}/api/download/${stage}/${sampleId}?${params.toString()}`;
}

/** Download a data URI (edited image) as a file with format conversion */
export async function downloadDataUriAsFile(
  dataUri: string,
  filename: string,
  format: 'jpg' | 'png' | 'webp'
): Promise<void> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUri;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => resolve(b!),
      mimeMap[format],
      format === 'png' ? undefined : 0.95
    );
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface AuthUser {
  fullName: string;
  email: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
  resetToken?: string;
}

// ─── Auth API Functions ─────────────────────────────────────────────────────

export async function registerUser(
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string
): Promise<MessageResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password, confirmPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
}

export async function loginUser(
  email: string,
  password: string,
  rememberMe = false
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, rememberMe }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Invalid email or password');
  }
  return res.json();
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<MessageResponse> {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Reset failed' }));
    throw new Error(err.detail || 'Reset failed');
  }
  return res.json();
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

