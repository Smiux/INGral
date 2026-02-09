import { useEffect, ReactNode } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      'theme': 'light',
      'toggleTheme': () => set((state) => ({
        'theme': state.theme === 'light' ? 'dark' : 'light'
      })),
      'setTheme': (theme) => set({ theme })
    }),
    {
      'name': 'theme-storage'
    }
  )
);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;

    root.classList.add('theme-transition');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const removeTransition = () => {
      root.classList.remove('theme-transition');
    };

    root.addEventListener('transitionend', removeTransition, { 'once': true });

    return () => {
      root.removeEventListener('transitionend', removeTransition);
    };
  }, [theme]);

  return <>{children}</>;
};
