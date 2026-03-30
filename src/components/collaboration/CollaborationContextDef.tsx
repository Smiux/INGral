import { createContext } from 'react';
import { CollaborationContextValue } from './types';

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

export { CollaborationContext };
