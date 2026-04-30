import { createContext, useContext } from 'react';
import { CollaborationContextValue } from './types';

export const CollaborationContext = createContext<CollaborationContextValue | null>(null);

export const useCollaboration = (): CollaborationContextValue => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};
