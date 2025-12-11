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
    
    // 添加过渡类，实现平滑主题切换
    root.classList.add('theme-transition');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // 移除过渡类，避免影响其他动画
    const removeTransition = () => {
      root.classList.remove('theme-transition');
    };
    
    // 监听过渡结束事件
    root.addEventListener('transitionend', removeTransition, { once: true });
    
    // 保存主题到 localStorage
    localStorage.setItem('theme', theme);
    
    return () => {
      root.removeEventListener('transitionend', removeTransition);
    };
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