import { createContext, useContext } from 'react';
import type { GraphContextValue } from './GraphTypes';

export const GraphContext = createContext<GraphContextValue | null>(null);

export const useGraphContext = (): GraphContextValue => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraphContext must be used within a GraphProvider');
  }
  return context;
};
