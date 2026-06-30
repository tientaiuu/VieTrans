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
          ? newQueue.length > 0 ? newQueue[0].id : null
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
      const currentItem = get().queue.find((q) => q.id === item.id);
      if (!currentItem || currentItem.status !== 'idle') continue;

      set((state) => ({
        queue: state.queue.map((q) =>
          q.id === item.id ? { ...q, status: 'uploading', progress: 5 } : q
        ),
        activeId: state.activeId ?? item.id,
      }));

      const updateItem = (patch: Partial<QueueItem>) => {
        set((state) => ({
          queue: state.queue.map((q) => q.id === item.id ? { ...q, ...patch } : q),
        }));
      };

      // Giả lập progress: tăng đều theo từng giai đoạn pipeline
      // 5→25 (OCR) → 25→48 (Translate) → 48→72 (Inpaint) → 72→92 (Render)
      const PROGRESS_STEPS = [
        { target: 25, delay: 400  },
        { target: 48, delay: 1200 },
        { target: 72, delay: 2000 },
        { target: 88, delay: 1500 },
        { target: 92, delay: 800  },
      ];
      let stepIdx = 0;
      let currentProgress = 5;
      const timers: ReturnType<typeof setInterval>[] = [];
      const clearTimers = () => timers.forEach(clearInterval);

      const advanceProgress = () => {
        if (stepIdx >= PROGRESS_STEPS.length) return;
        const step = PROGRESS_STEPS[stepIdx];
        const ticks = Math.ceil(step.delay / 80);
        const inc = (step.target - currentProgress) / ticks;
        let tick = 0;
        const iv = setInterval(() => {
          tick++;
          currentProgress = Math.min(step.target, currentProgress + inc);
          updateItem({ progress: Math.round(currentProgress) });
          if (tick >= ticks) {
            clearInterval(iv);
            stepIdx++;
            advanceProgress();
          }
        }, 80);
        timers.push(iv);
      };

      advanceProgress();

      const token = useAppStore.getState().token ?? undefined;

      try {
        const result = await uploadImage(item.file, token);
        clearTimers();
        updateItem({ progress: 100 });
        await new Promise((r) => setTimeout(r, 600));
        updateItem({ status: 'done', result });
      } catch (err) {
        clearTimers();
        updateItem({
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
          progress: 0,
        });
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
