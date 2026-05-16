import { useContext } from 'react';
import { GrayThemeContext, type GrayThemeName } from './GrayThemeContext';

export { type GrayThemeName };

export interface GrayThemeContextValue {
  'theme': GrayThemeName;
  'setTheme': (name: GrayThemeName) => void;
  'labels': Record<GrayThemeName, string>;
}

export function useGrayTheme (): GrayThemeContextValue {
  const context = useContext(GrayThemeContext);
  if (!context) {
    throw new Error('useGrayTheme must be used within a GrayThemeProvider');
  }
  return context;
}
