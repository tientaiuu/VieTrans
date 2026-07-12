/**
 * VieTrans API Client
 * Communicates with the FastAPI backend at localhost:8000
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_UPLOAD_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export function validateImageFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_UPLOAD_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasAllowedExtension) {
    return 'Only JPG, PNG, and WebP images are supported.';
  }
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
    return 'The selected file type is not supported.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'Image is too large. Maximum size is 10MB.';
  }
  return null;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PipelineStages {
  input: string;
  back: string;
  text_en: string;
  text_vi: string;
  fuse: string;
}

export type PipelineStepStatus = 'complete' | 'warning' | 'skipped' | 'pending' | 'error';

export interface PipelineStep {
  key: string;
  label: string;
  detail: string;
  image?: string | null;
  duration_seconds?: number | null;
  status?: PipelineStepStatus;
  metrics?: Record<string, string | number | boolean | null | undefined>;
}

export interface PipelineTranslationRecord {
  index?: number | null;
  source_text: string;
  translated_text: string;
  keep_original?: boolean;
  confidence?: number | null;
  box?: number[] | null;
}

export interface PipelineDebugSummary {
  sample_id?: string | number;
  counts?: Record<string, string | number | null | undefined>;
  timings?: Record<string, number | null | undefined>;
  qa?: Record<string, unknown>;
  steps?: PipelineStep[];
  translation_records?: PipelineTranslationRecord[];
  translation_record_count?: number;
}

export interface SampleDetail {
  id: number | string;
  tit: string;
  ocr: string;
  stages: PipelineStages;
  pipeline?: PipelineDebugSummary;
}

export interface UploadResult {
  matched_id: number | string;
  match_quality?: string;
  tit: string;
  ocr: string;
  stages: PipelineStages;
  latency?: Record<string, number | null | undefined>;
  pipeline?: PipelineDebugSummary;
  edit_token?: string;
}

export type UploadJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface UploadJobResponse {
  job_id: string;
  sample_id: string;
  matched_id?: number | string;
  status: UploadJobStatus;
  poll_url?: string;
  edit_token?: string;
  result?: UploadResult;
  error?: string;
  created_at?: string | null;
  updated_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface PipelineInfo {
  total_samples: number;
  stages: { key: string; name: string; name_en: string }[];
  models: Record<string, Record<string, unknown>>;
  image_size: { width: number | string; height: number | string };
}

const UPLOAD_JOB_POLL_INTERVAL_MS = 1500;
const UPLOAD_JOB_TIMEOUT_MS = 20 * 60 * 1000;

function isUploadResult(value: unknown): value is UploadResult {
  return !!value
    && typeof value === 'object'
    && 'matched_id' in value
    && 'stages' in value
    && 'tit' in value;
}

function isUploadJobResponse(value: unknown): value is UploadJobResponse {
  return !!value
    && typeof value === 'object'
    && 'job_id' in value
    && 'status' in value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── API Functions ──────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{
  status: string;
  total_samples: number;
  queued_jobs?: number;
  upload_workers?: number;
  space_concurrency?: number;
}> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Backend unavailable');
  return res.json();
}

export async function getPipelineInfo(): Promise<PipelineInfo> {
  const res = await fetch(`${API_BASE}/api/pipeline-info`);
  if (!res.ok) throw new Error('Failed to fetch pipeline info');
  return res.json();
}

export async function getSample(id: number | string): Promise<SampleDetail> {
  const res = await fetch(`${API_BASE}/api/samples/${id}`);
  if (!res.ok) throw new Error(`Sample ${id} not found`);
  return res.json();
}

export async function getUploadJob(jobId: string, token?: string): Promise<UploadJobResponse> {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/jobs/${encodeURIComponent(jobId)}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch upload job' }));
    throw new Error(err.detail || 'Failed to fetch upload job');
  }
  return res.json();
}

export async function waitForUploadJob(
  initialJob: UploadJobResponse,
  token?: string,
  onUpdate?: (job: UploadJobResponse) => void
): Promise<UploadResult> {
  let job = initialJob;
  const startedAt = Date.now();
  onUpdate?.(job);

  while (Date.now() - startedAt < UPLOAD_JOB_TIMEOUT_MS) {
    if (job.status === 'succeeded' && job.result) {
      return {
        ...job.result,
        edit_token: initialJob.edit_token ?? job.result.edit_token,
      };
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'Upload failed');
    }

    await delay(UPLOAD_JOB_POLL_INTERVAL_MS);
    job = await getUploadJob(job.job_id, token);
    onUpdate?.(job);
  }

  throw new Error('Upload job timed out. Please check your history or try again later.');
}

export async function createUploadJob(file: File, token?: string): Promise<UploadJobResponse> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

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

  const data = await res.json();
  if (isUploadResult(data)) {
    return {
      job_id: String(data.matched_id),
      sample_id: String(data.matched_id),
      matched_id: data.matched_id,
      status: 'succeeded',
      result: data,
      edit_token: data.edit_token,
    };
  }
  if (isUploadJobResponse(data)) {
    return data;
  }
  throw new Error('Upload failed: unexpected backend response');
}

export async function uploadImage(file: File, token?: string): Promise<UploadResult> {
  const job = await createUploadJob(file, token);
  return waitForUploadJob(job, token);
}

export async function updateFuseImage(
  sampleId: string | number,
  imageData: string,
  token?: string | null,
  editToken?: string | null
): Promise<void> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (editToken) {
    headers['X-Edit-Token'] = editToken;
  }

  const res = await fetch(`${API_BASE}/api/update-fuse/${sampleId}`, {
    method: 'POST',
    headers,
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
  pipeline?: PipelineDebugSummary;
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
  avatar?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
  resetToken?: string;
}

export interface ApiKeyInfo {
  hasKey: boolean;
  lastFour?: string | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
}

export interface ApiKeyResponse extends ApiKeyInfo {
  apiKey: string;
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

export async function loginWithGoogle(
  credential: string,
  rememberMe = true
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, rememberMe }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Google sign-in failed' }));
    throw new Error(err.detail || 'Google sign-in failed');
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
  const resetToken = token.trim();
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, newPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Reset failed' }));
    const detail = Array.isArray(err.detail)
      ? err.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(', ')
      : err.detail;
    throw new Error(detail || 'Reset failed');
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

export async function getApiKeyInfo(token: string): Promise<ApiKeyInfo> {
  const res = await fetch(`${API_BASE}/api/auth/api-key`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load API key' }));
    throw new Error(err.detail || 'Failed to load API key');
  }
  return res.json();
}

export async function generateApiKey(token: string): Promise<ApiKeyResponse> {
  const res = await fetch(`${API_BASE}/api/auth/api-key`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate API key' }));
    throw new Error(err.detail || 'Failed to generate API key');
  }
  return res.json();
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<MessageResponse> {
  const res = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Change password failed' }));
    throw new Error(err.detail || 'Change password failed');
  }
  return res.json();
}
