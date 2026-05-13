/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, type ReactNode } from 'react';
import {
  type GrayThemeName,
  GRAY_THEME_LABELS,
  initGrayTheme,
  applyGrayTheme
} from '@/components/ui/grayThemes';

export type { GrayThemeName };

interface GrayThemeContextValue {
  'theme': GrayThemeName;
  'setTheme': (name: GrayThemeName) => void;
  'labels': Record<GrayThemeName, string>;
}

export const GrayThemeContext = createContext<GrayThemeContextValue | null>(null);

export function GrayThemeProvider ({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<GrayThemeName>(() => initGrayTheme());

  const setTheme = useCallback((name: GrayThemeName) => {
    setThemeState(name);
    applyGrayTheme(name);
  }, []);

  return (
    <GrayThemeContext.Provider value={{ theme, setTheme, 'labels': GRAY_THEME_LABELS }}>
      {children}
    </GrayThemeContext.Provider>
  );
}
