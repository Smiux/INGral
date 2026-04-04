import * as Y from 'yjs';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  currentPath: string | null;
}

export interface RecentRoom {
  id: string;
  lastAccessed: number;
}

export interface ArticleMetadataMaps {
  title: Y.Map<string>;
  summary: Y.Map<string>;
  tags: Y.Array<string>;
  coverImage: Y.Map<string | null>;
}

export interface CollaborationContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: ConnectionStatus;
  roomId: string | null;
  userId: string | null;
  userName: string;
  userColor: string;
  collaborators: Collaborator[];
  doc: import('yjs').Doc | null;
  provider: unknown;
  connect: (roomId: string) => void;
  disconnect: () => void;
  setUserName: (name: string) => void;
  setUserColor: (color: string) => void;
  isPanelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  recentRooms: RecentRoom[];
  isLoadingRooms: boolean;
  refreshRooms: () => Promise<void>;
  inputRoomId: string;
  setInputRoomId: (roomId: string) => void;
  articleMetadata: ArticleMetadataMaps | null;
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
