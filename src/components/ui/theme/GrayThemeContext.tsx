import { createContext } from 'react';
import { type GrayThemeName } from '@/components/ui/theme/grayThemes';

export type { GrayThemeName };

interface GrayThemeContextValue {
  'theme': GrayThemeName;
  'setTheme': (name: GrayThemeName) => void;
  'labels': Record<GrayThemeName, string>;
}

export const GrayThemeContext = createContext<GrayThemeContextValue | null>(null);
