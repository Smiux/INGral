import { createClient, LiveList, LiveMap } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';

export type Presence = {
  cursor: { x: number; y: number } | null;
  currentPath: string | null;
  userName: string;
  userColor: string;
};

export type MediaType = 'image' | 'audio' | 'gif';

export type MediaAttachment = {
  type: MediaType;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
};

export type ChatThread = {
  id: string;
  title: string | null;
  createdAt: number;
  createdBy: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  createdAt: number;
  threadId: string | null;
  replyTo: string | null;
  media: MediaAttachment[];
  isEdited: boolean;
  editedAt: number | null;
};

export type Storage = {
  messages: LiveList<ChatMessage>;
  threads: LiveMap<string, ChatThread>;
  mainThreadTitle: string;
};

const client = createClient({
  'publicApiKey': (import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY as string) || '',
  'throttle': 16
});

export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useOthersConnectionIds,
  useOther,
  useSelf,
  useStatus,
  useStorage,
  useMutation
} = createRoomContext<Presence, Storage>(client);
