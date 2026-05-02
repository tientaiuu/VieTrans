import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface AppState {
  theme: Theme;
  activePage: string;
  authOpen: boolean;
  isLoggedIn: boolean;
  userFullName: string;
  userEmail: string;
  userUsername: string;
  userAvatar: string | null;
  emailNotifications: boolean;
  autoSaveHistory: boolean;
  defaultOutputFormat: 'png' | 'jpg' | 'webp';
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setActivePage: (page: string) => void;
  openAuth: () => void;
  closeAuth: () => void;
  login: (fullName: string, email: string) => void;
  updateProfile: (profile: { fullName: string; username: string }) => void;
  setUserAvatar: (avatar: string | null) => void;
  updateSettings: (settings: {
    theme: Theme;
    emailNotifications: boolean;
    autoSaveHistory: boolean;
    defaultOutputFormat: 'png' | 'jpg' | 'webp';
  }) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      activePage: 'home',
      authOpen: false,
      isLoggedIn: false,
      userFullName: '',
      userEmail: '',
      userUsername: '',
      userAvatar: null,
      emailNotifications: true,
      autoSaveHistory: true,
      defaultOutputFormat: 'png',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),
      setActivePage: (page) => set({ activePage: page }),
      openAuth: () => set({ authOpen: true }),
      closeAuth: () => set({ authOpen: false }),
      login: (fullName: string, email: string) =>
        set({
          isLoggedIn: true,
          userFullName: fullName,
          userEmail: email,
          userUsername: email.split('@')[0] || 'user',
        }),
      updateProfile: ({ fullName, username }) =>
        set({
          userFullName: fullName,
          userUsername: username,
        }),
      setUserAvatar: (avatar) => set({ userAvatar: avatar }),
      updateSettings: ({ theme, emailNotifications, autoSaveHistory, defaultOutputFormat }) =>
        set({
          theme,
          emailNotifications,
          autoSaveHistory,
          defaultOutputFormat,
        }),
      logout: () => set({ isLoggedIn: false, userFullName: '', userEmail: '', userUsername: '', userAvatar: null }),
    }),
    {
      name: 'vietrans-app-storage',
    }
  )
);
