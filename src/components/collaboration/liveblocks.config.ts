import { createClient, LiveList, LiveObject } from '@liveblocks/client';
import { createRoomContext, shallow } from '@liveblocks/react';

export { LiveList, LiveObject };

export type Presence = {
  cursor: { x: number; y: number } | null;
  currentPath: string | null;
  userId: string;
  userName: string;
  userColor: string;
  peerId: string | null;
  joinedAt: number;
  mediaPeerId: string | null;
  mediaType: 'video' | 'screen' | 'audio-call' | 'audio-share' | null;
};

export type MessageAttachmentType = 'image' | 'audio';

export type MessageAttachment = {
  id: string;
  type: MessageAttachmentType;
  data: string;
  mimeType?: string;
  fileName?: string;
};

export type Message = {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  attachments: MessageAttachment[];
  createdAt: number;
  editedAt: number | null;
  replyToId: string | null;
  threadId: string | null;
};

export type Thread = {
  id: string;
  channelId: string;
  parentMessageId: string;
  createdAt: number;
  createdBy: string;
  createdByUserName: string;
};

export type PinnedMessage = {
  id: string;
  messageId: string;
  channelId: string;
  pinnedAt: number;
  pinnedBy: string;
  pinnedByUserName: string;
};

export type ChannelType = 'chat' | 'share';

export type Channel = {
  id: string;
  name: string;
  type: ChannelType;
  isDefault: boolean;
};

export type ArticleMetadata = {
  title: string;
  summary: string;
  tags: string[];
  coverImage: string | null;
};

export type AudioTrackData = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string | null;
  addedBy: string;
  addedByName: string;
  addedAt: number;
};

export type AudioPlaybackState = {
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  autoPlayNext: boolean;
};

export type Storage = {
  channels: LiveList<LiveObject<Channel>>;
  messages: LiveList<LiveObject<Message>>;
  threads: LiveList<LiveObject<Thread>>;
  pinnedMessages: LiveList<LiveObject<PinnedMessage>>;
  articleMetadata: LiveObject<ArticleMetadata>;
  audioPlaylist: LiveList<LiveObject<AudioTrackData>>;
  audioPlaybackState: LiveObject<AudioPlaybackState>;
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
  useOthersMapped,
  useOthersConnectionIds,
  useOther,
  useSelf,
  useStatus,
  useStorage,
  useMutation,
  useUser
} = createRoomContext<Presence, Storage>(client);

export { shallow };
