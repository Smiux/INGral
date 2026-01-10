import { useThemeStore } from './themeStore';

// Custom hook to use theme store
export const useTheme = () => {
  return useThemeStore();
};
