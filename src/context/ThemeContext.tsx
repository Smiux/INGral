import { useState, useEffect, ReactNode } from 'react';
import { ThemeContext, Theme } from './ThemeContext';

// Theme provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Initialize theme from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage for saved theme
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      return savedTheme;
    }
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    // Default to light theme
    return 'light';
  });

  // Update document class when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};