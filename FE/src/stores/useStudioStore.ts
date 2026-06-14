import { create } from 'zustand';
import { uploadImage, type UploadResult } from '../api';
import { useAppStore } from './useAppStore';

export type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'uploading' | 'done' | 'error';
  progress: number;
  result: UploadResult | null;
  error: string | null;
  editedImage: string | null;
};

interface StudioState {
  queue: QueueItem[];
  activeId: string | null;
  isProcessingAll: boolean;

  addFiles: (files: File[]) => void;
  removeItem: (id: string) => void;
  setActiveId: (id: string) => void;
  setEditedImage: (id: string, dataUrl: string | null) => void;
  processAll: () => Promise<void>;
  reset: () => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  queue: [],
  activeId: null,
  isProcessingAll: false,

  addFiles: (files) => {
    const newItems: QueueItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'idle',
      progress: 0,
      result: null,
      error: null,
      editedImage: null,
    }));
    set((state) => ({
      queue: [...state.queue, ...newItems],
      activeId: state.activeId ?? (newItems.length > 0 ? newItems[0].id : null),
    }));
  },

  removeItem: (id) => {
    const item = get().queue.find((q) => q.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    set((state) => {
      const newQueue = state.queue.filter((q) => q.id !== id);
      const newActiveId =
        state.activeId === id
          ? newQueue.length > 0
            ? newQueue[0].id
            : null
          : state.activeId;
      return { queue: newQueue, activeId: newActiveId };
    });
  },

  setActiveId: (id) => set({ activeId: id }),

  setEditedImage: (id, dataUrl) => {
    set((state) => ({
      queue: state.queue.map((q) =>
        q.id === id ? { ...q, editedImage: dataUrl } : q
      ),
    }));
  },

  processAll: async () => {
    const { queue } = get();
    const idleItems = queue.filter((q) => q.status === 'idle');
    if (idleItems.length === 0) return;

    set({ isProcessingAll: true });

    for (const item of idleItems) {
      // Check if this item is still in queue (might have been removed)
      const currentQueue = get().queue;
      const currentItem = currentQueue.find((q) => q.id === item.id);
      if (!currentItem || currentItem.status !== 'idle') continue;

      // Set uploading
      set((state) => ({
        queue: state.queue.map((q) =>
          q.id === item.id ? { ...q, status: 'uploading', progress: 10 } : q
        ),
        activeId: state.activeId ?? item.id,
      }));

      // Progress simulation
      const interval = setInterval(() => {
        set((state) => ({
          queue: state.queue.map((q) =>
            q.id === item.id && q.status === 'uploading'
              ? { ...q, progress: q.progress < 90 ? q.progress + 5 : q.progress }
              : q
          ),
        }));
      }, 300);

      try {
        const token = useAppStore.getState().token;
        const result = await uploadImage(item.file, token || undefined);
        clearInterval(interval);
        set((state) => ({
          queue: state.queue.map((q) =>
            q.id === item.id
              ? { ...q, status: 'done', progress: 100, result }
              : q
          ),
          // Set as activeId if nothing was active
          activeId: state.activeId ?? item.id,
        }));
      } catch (err: unknown) {
        clearInterval(interval);
        const message =
          err instanceof Error ? err.message : 'Translation failed';
        set((state) => ({
          queue: state.queue.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', error: message, progress: 0 }
              : q
          ),
        }));
      }
    }

    set({ isProcessingAll: false });
  },

  reset: () => {
    const { queue } = get();
    queue.forEach((q) => URL.revokeObjectURL(q.previewUrl));
    set({ queue: [], activeId: null, isProcessingAll: false });
  },
}));
