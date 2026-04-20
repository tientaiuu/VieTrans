import { create } from 'zustand';
import { uploadImage, type UploadResult } from '../api';

export type TranslationStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface StudioState {
  file: File | null;
  previewUrl: string | null;
  status: TranslationStatus;
  progress: number;
  result: UploadResult | null;
  error: string | null;
  
  // Actions
  setFile: (file: File | null) => void;
  reset: () => void;
  processTranslation: () => Promise<void>;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  file: null,
  previewUrl: null,
  status: 'idle',
  progress: 0,
  result: null,
  error: null,

  setFile: (file) => {
    if (get().previewUrl) {
      URL.revokeObjectURL(get().previewUrl!);
    }
    set({ 
      file, 
      previewUrl: file ? URL.createObjectURL(file) : null,
      status: file ? 'idle' : 'idle',
      result: null,
      error: null,
      progress: 0
    });
  },

  reset: () => {
    const { previewUrl } = get();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    set({ file: null, previewUrl: null, status: 'idle', progress: 0, result: null, error: null });
  },

  processTranslation: async () => {
    const { file } = get();
    if (!file) return;

    set({ status: 'uploading', progress: 10, error: null });

    try {
      // Simulate some initial upload progress
      const interval = setInterval(() => {
        set((state) => ({ 
          progress: state.progress < 90 ? state.progress + (state.status === 'uploading' ? 5 : 2) : state.progress 
        }));
      }, 300);

      const result = await uploadImage(file);
      
      clearInterval(interval);
      set({ status: 'done', progress: 100, result });
    } catch (err: any) {
      set({ status: 'error', error: err.message || 'Translation failed', progress: 0 });
    }
  }
}));
