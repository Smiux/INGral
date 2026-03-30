import { useContext } from 'react';
import { CollaborationContext } from './CollaborationContextDef';
import type { CollaborationContextValue } from './types';

export function useCollaboration (): CollaborationContextValue {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}

export function useCollaborationOptional (): CollaborationContextValue | null {
  return useContext(CollaborationContext);
}
