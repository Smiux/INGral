import { useEffect, ReactNode } from 'react';
import { useThemeStore } from './themeStore';

// Define theme types
export type Theme = 'light' | 'dark';

// Theme provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Get theme from Zustand store
  const { theme } = useThemeStore();

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
    root.addEventListener('transitionend', removeTransition, { 'once': true });

    return () => {
      root.removeEventListener('transitionend', removeTransition);
    };
  }, [theme]);

  return <>{children}</>;
};
