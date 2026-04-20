import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface AppState {
  theme: Theme;
  activePage: string;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setActivePage: (page: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      activePage: 'home',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),
      setActivePage: (page) => set({ activePage: page }),
    }),
    {
      name: 'vietrans-app-storage',
    }
  )
);
