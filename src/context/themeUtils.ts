import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';

/**
 * Theme interface definition
 */
export interface Theme {
  colors: {
    textPrimary?: string;
    borderColor?: string;
    bgPrimary?: string;
    primaryColor?: string;
  };
}

/**
 * Default theme
 */
export const defaultTheme: Theme = {
  colors: {
    textPrimary: '#333',
    borderColor: '#e0e0e0',
    bgPrimary: '#fff',
    primaryColor: '#4f46e5'
  }
};

/**
 * Hook for accessing theme functionality
 * @returns Theme context
 */
export const useTheme = () => {
  return useContext(ThemeContext);
};
