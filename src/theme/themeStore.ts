import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define theme types
export type Theme = 'light' | 'dark';

// Define store state interface
interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;

  setTheme: (theme: Theme) => void;
}

// Create theme store with persistence
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // Initialize theme from system preference or default to light
      'theme': (() => {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined') {
          return (localStorage.getItem('theme') as Theme) ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
        return 'light';
      })(),

      'toggleTheme': () => set((state) => ({
        'theme': state.theme === 'light' ? 'dark' : 'light'
      })),

      'setTheme': (theme) => {
        set({ theme });
      }
    }),
    {
      'name': 'theme-storage',
      // Only persist theme state
      'partialize': (state) => ({ 'theme': state.theme })
    }
  )
);
