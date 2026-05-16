import { useState, useCallback, type ReactNode } from 'react';
import {
  type GrayThemeName,
  GRAY_THEME_LABELS,
  initGrayTheme,
  applyGrayTheme
} from './grayThemes';
import { GrayThemeContext } from './GrayThemeContext';

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
