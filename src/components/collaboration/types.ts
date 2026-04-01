import * as Y from 'yjs';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  currentPath: string | null;
}

export interface CollaborationState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: ConnectionStatus;
  roomId: string | null;
  userName: string;
  userId: string;
  userColor: string;
  collaborators: Collaborator[];
  messages: ChatMessage[];
  error: string | null;
  meta: {
    title: string;
    summary: string;
    tags: string[];
    coverImage: string | null;
  };
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  timestamp: number;
}

export interface CollaborationContextValue extends CollaborationState {
  doc: Y.Doc | null;
  provider: unknown;
  connect: (roomId: string) => void;
  disconnect: () => void;
  setUserName: (name: string) => void;
  setUserColor: (color: string) => void;
  sendMessage: (content: string) => void;
  updateMeta: (meta: Partial<CollaborationState['meta']>) => void;
  updateCurrentPath: (path: string | null) => void;
}

export const COLLABORATOR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#06b6d4'
];

export function getRandomColor (): string {
  return COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)]!;
}
