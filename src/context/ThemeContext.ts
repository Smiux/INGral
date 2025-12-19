import { createContext } from 'react';

// Define theme types
export type Theme = 'light' | 'dark';

// Define context type
export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
    setTheme: (_theme: Theme) => void;
}

// Create context with default values
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
