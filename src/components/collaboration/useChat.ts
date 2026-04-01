import { useCallback, useMemo } from 'react';
import {
  useStorage,
  useMutation,
  useMyPresence,
  type ChatMessage,
  type ChatThread,
  type MediaAttachment
} from './liveblocks.config';

export type { ChatMessage, ChatThread, MediaAttachment };

function generateId (): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
}

export function useChatMessages (threadId?: string): ChatMessage[] {
  const messages = useStorage((root) => root.messages);

  return useMemo(() => {
    if (!messages) {
      return [];
    }
    const allMessages = [...messages];
    if (threadId === undefined) {
      return allMessages.filter((msg) => !msg.threadId);
    }
    return allMessages.filter((msg) => msg.threadId === threadId);
  }, [messages, threadId]);
}

export function useChatThreads (): ChatThread[] {
  const threads = useStorage((root) => root.threads);

  return useMemo(() => {
    if (!threads) {
      return [];
    }
    return Array.from(threads.values());
  }, [threads]);
}

interface SendMessageParams {
  content: string;
  media?: MediaAttachment[];
  threadId?: string;
}

export function useSendMessage (): (params: SendMessageParams) => void {
  const [myPresence] = useMyPresence();

  const sendMessage = useMutation(
    ({ storage }, params: SendMessageParams) => {
      const { content, media = [], threadId } = params;
      const messages = storage.get('messages');
      const userName = myPresence.userName ?? 'Anonymous';
      const userColor = myPresence.userColor ?? '#888888';

      messages.push({
        'id': generateId(),
        'userId': myPresence.userName ?? 'anonymous',
        userName,
        userColor,
        'content': content.trim(),
        'createdAt': Date.now(),
        'threadId': threadId ?? null,
        'replyTo': null,
        media,
        'isEdited': false,
        'editedAt': null
      });
    },
    [myPresence.userName, myPresence.userColor]
  );

  return useCallback((params: SendMessageParams) => {
    sendMessage(params);
  }, [sendMessage]);
}

interface SendReplyParams {
  messageId: string;
  content: string;
  media?: MediaAttachment[];
  threadId?: string;
}

export function useSendReply (): (params: SendReplyParams) => void {
  const [myPresence] = useMyPresence();

  const sendReply = useMutation(
    ({ storage }, params: SendReplyParams) => {
      const { messageId, content, media = [], threadId } = params;
      const messages = storage.get('messages');
      const userName = myPresence.userName ?? 'Anonymous';
      const userColor = myPresence.userColor ?? '#888888';

      messages.push({
        'id': generateId(),
        'userId': myPresence.userName ?? 'anonymous',
        userName,
        userColor,
        'content': content.trim(),
        'createdAt': Date.now(),
        'threadId': threadId ?? null,
        'replyTo': messageId,
        media,
        'isEdited': false,
        'editedAt': null
      });
    },
    [myPresence.userName, myPresence.userColor]
  );

  return useCallback((params: SendReplyParams) => {
    sendReply(params);
  }, [sendReply]);
}

export function useCreateThread (): (title?: string) => string | null {
  const [myPresence] = useMyPresence();

  const createThread = useMutation(({ storage }, title?: string) => {
    const threads = storage.get('threads');
    const threadId = generateId();
    const userName = myPresence.userName ?? 'Anonymous';

    const thread: ChatThread = {
      'id': threadId,
      'title': title ?? null,
      'createdAt': Date.now(),
      'createdBy': userName
    };

    threads.set(threadId, thread);
    return threadId;
  }, [myPresence.userName]);

  return useCallback((title?: string) => {
    return createThread(title);
  }, [createThread]);
}

export function useRenameThread (): (threadId: string, title: string) => void {
  const renameThread = useMutation(({ storage }, threadId: string, title: string) => {
    const threads = storage.get('threads');
    const thread = threads.get(threadId);
    if (thread) {
      threads.set(threadId, {
        ...thread,
        'title': title.trim() || null
      });
    }
  }, []);

  return useCallback((threadId: string, title: string) => {
    renameThread(threadId, title);
  }, [renameThread]);
}

export function useDeleteThread (): (threadId: string) => void {
  const deleteThread = useMutation(({ storage }, threadId: string) => {
    const threads = storage.get('threads');
    const messages = storage.get('messages');
    threads.delete(threadId);
    const messageIndexes = messages.toArray()
      .map((msg, index) => (msg.threadId === threadId ? index : -1))
      .filter((index) => index !== -1)
      .sort((a, b) => b - a);
    for (const index of messageIndexes) {
      messages.delete(index);
    }
  }, []);

  return useCallback((threadId: string) => {
    deleteThread(threadId);
  }, [deleteThread]);
}

export function useDeleteMessage (): (messageId: string) => void {
  const deleteMessage = useMutation(({ storage }, messageId: string) => {
    const messages = storage.get('messages');
    const index = messages.toArray().findIndex((msg) => msg.id === messageId);
    if (index !== -1) {
      messages.delete(index);
    }
  }, []);

  return useCallback((messageId: string) => {
    deleteMessage(messageId);
  }, [deleteMessage]);
}

export function useEditMessage (): (messageId: string, newContent: string) => void {
  const editMessage = useMutation(({ storage }, messageId: string, newContent: string) => {
    const messages = storage.get('messages');
    const index = messages.toArray().findIndex((msg) => msg.id === messageId);
    if (index !== -1) {
      const msg = messages.get(index);
      if (msg) {
        messages.set(index, {
          ...msg,
          'content': newContent.trim(),
          'isEdited': true,
          'editedAt': Date.now()
        });
      }
    }
  }, []);

  return useCallback((messageId: string, newContent: string) => {
    editMessage(messageId, newContent);
  }, [editMessage]);
}

export function useMessageCount (threadId?: string): number {
  const messages = useStorage((root) => root.messages);

  return useMemo(() => {
    if (!messages) {
      return 0;
    }
    if (threadId === undefined) {
      return messages.filter((msg) => !msg.threadId).length;
    }
    return messages.filter((msg) => msg.threadId === threadId).length;
  }, [messages, threadId]);
}

export function useMainThreadTitle (): string {
  const mainTitle = useStorage((root) => root.mainThreadTitle);

  return mainTitle ?? '主聊天';
}

export function useRenameMainThread (): (title: string) => void {
  const renameMainThread = useMutation(({ storage }, title: string) => {
    storage.set('mainThreadTitle', title.trim() || '主聊天');
  }, []);

  return useCallback((title: string) => {
    renameMainThread(title);
  }, [renameMainThread]);
}
