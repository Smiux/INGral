import { useThemeStore } from '../stores/themeStore';

// Custom hook to use theme store
export const useTheme = () => {
  return useThemeStore();
};
