import React, { createContext, useCallback, useRef, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { SupabaseProvider } from './SupabaseProvider';
import {
  CollaborationContextValue,
  CollaborationState,
  Collaborator,
  ChatMessage,
  generateUserId
} from './types';
import { useCollaborationSettings } from './useCollaborationSettings';

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

interface CollaborationProviderProps {
  children: React.ReactNode;
  externalUserName?: string;
  externalUserColor?: string;
}

export function CollaborationProvider ({
  children,
  externalUserName,
  externalUserColor
}: CollaborationProviderProps) {
  const { 'userName': savedUserName, 'userColor': savedUserColor } = useCollaborationSettings();
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<SupabaseProvider | null>(null);

  const userName = externalUserName ?? savedUserName;
  const userColor = externalUserColor ?? savedUserColor;

  const initialState = useMemo<CollaborationState>(() => ({
    'isConnected': false,
    'isConnecting': false,
    'roomId': null,
    userName,
    'userId': generateUserId(),
    userColor,
    'collaborators': [],
    'messages': [],
    'error': null,
    'meta': {
      'title': '',
      'summary': '',
      'tags': [],
      'coverImage': null
    }
  }), [userName, userColor]);

  const [state, setState] = useState<CollaborationState>(initialState);

  const providerRef = useRef<SupabaseProvider | null>(null);
  const awarenessRef = useRef<SupabaseProvider['awareness'] | null>(null);
  const chatMapRef = useRef<Y.Map<string> | null>(null);
  const metaMapRef = useRef<Y.Map<unknown> | null>(null);

  const cleanup = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }
    setProvider(null);
    setDoc(null);
    awarenessRef.current = null;
    chatMapRef.current = null;
    metaMapRef.current = null;
  }, []);

  const connect = useCallback((roomId: string) => {
    cleanup();

    setState((prev) => ({ ...prev, 'isConnecting': true, 'error': null, roomId }));

    const newDoc = new Y.Doc();
    const newProvider = new SupabaseProvider(newDoc, {
      'channel': `collaboration-${roomId}`,
      'id': roomId
    });

    setDoc(newDoc);
    setProvider(newProvider);
    providerRef.current = newProvider;
    awarenessRef.current = newProvider.awareness;

    chatMapRef.current = newDoc.getMap('chat');
    metaMapRef.current = newDoc.getMap('meta');

    newProvider.awareness.setLocalStateField('user', {
      'id': state.userId,
      'name': userName,
      'color': userColor,
      'cursorPosition': null,
      'mousePosition': null,
      'currentPath': null,
      'lastActive': Date.now()
    });

    newProvider.setStatusCallback(() => {
      setState((prev) => ({ ...prev, 'isConnected': true, 'isConnecting': false }));
    });

    newProvider.on('awareness', () => {
      const awareness = awarenessRef.current;
      if (!awareness) {
        return;
      }

      const states = awareness.getStates();
      const collaborators: Collaborator[] = [];

      type AwarenessUserState = {
        id: string;
        name: string;
        color: string;
        cursorPosition?: number;
        mousePosition?: { x: number; y: number } | null;
        currentPath?: string | null;
        lastActive: number;
      };

      states.forEach((awarenessState: { user?: AwarenessUserState }, clientId: number) => {
        if (clientId !== awareness.clientID && awarenessState.user) {
          const collaborator: Collaborator = {
            'id': awarenessState.user.id,
            'name': awarenessState.user.name,
            'color': awarenessState.user.color,
            'lastActive': awarenessState.user.lastActive
          };
          if (awarenessState.user.cursorPosition !== undefined) {
            collaborator.cursorPosition = awarenessState.user.cursorPosition;
          }
          if (awarenessState.user.mousePosition !== undefined) {
            collaborator.mousePosition = awarenessState.user.mousePosition;
          }
          if (awarenessState.user.currentPath !== undefined) {
            collaborator.currentPath = awarenessState.user.currentPath;
          }
          collaborators.push(collaborator);
        }
      });

      setState((prev) => ({ ...prev, collaborators }));
    });

    chatMapRef.current.observe(() => {
      const messages: ChatMessage[] = [];
      chatMapRef.current?.forEach((value, key) => {
        try {
          const msg = JSON.parse(value as string);
          messages.push({ 'id': key, ...msg });
        } catch {
          // 忽略解析错误
        }
      });
      messages.sort((a, b) => a.timestamp - b.timestamp);
      setState((prev) => ({ ...prev, messages }));
    });

    metaMapRef.current.observe(() => {
      const title = metaMapRef.current?.get('title') as string | undefined;
      const summary = metaMapRef.current?.get('summary') as string | undefined;
      const tags = metaMapRef.current?.get('tags') as string[] | undefined;
      const coverImage = metaMapRef.current?.get('coverImage') as string | undefined;

      setState((prev) => ({
        ...prev,
        'meta': {
          'title': title ?? prev.meta.title,
          'summary': summary ?? prev.meta.summary,
          'tags': tags ?? prev.meta.tags,
          'coverImage': coverImage !== undefined ? coverImage : prev.meta.coverImage
        }
      }));
    });

    newProvider.on('sync', () => {
      const messages: ChatMessage[] = [];
      chatMapRef.current?.forEach((value, key) => {
        try {
          const msg = JSON.parse(value as string);
          messages.push({ 'id': key, ...msg });
        } catch {
          // 忽略解析错误
        }
      });
      messages.sort((a, b) => a.timestamp - b.timestamp);
      setState((prev) => ({ ...prev, messages }));
    });
  }, [state.userId, userName, userColor, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setState((prev) => ({
      ...prev,
      'isConnected': false,
      'isConnecting': false,
      'roomId': null,
      'collaborators': [],
      'messages': []
    }));
  }, [cleanup]);

  const setUserName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, 'userName': name }));
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('user', {
        'id': state.userId,
        name,
        'color': state.userColor,
        'cursorPosition': null,
        'lastActive': Date.now()
      });
    }
  }, [state.userId, state.userColor]);

  const setUserColor = useCallback((color: string) => {
    setState((prev) => ({ ...prev, 'userColor': color }));
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('user', {
        'id': state.userId,
        'name': state.userName,
        color,
        'cursorPosition': null,
        'lastActive': Date.now()
      });
    }
  }, [state.userId, state.userName]);

  const sendMessage = useCallback((content: string) => {
    if (!chatMapRef.current || !content.trim()) {
      return;
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36)
      .substring(2, 9)}`;
    const messageData = JSON.stringify({
      'userId': state.userId,
      'userName': state.userName,
      'userColor': state.userColor,
      'content': content.trim(),
      'timestamp': Date.now()
    });

    chatMapRef.current.set(messageId, messageData);
  }, [state.userId, state.userName, state.userColor]);

  const updateCursorPosition = useCallback((position: number) => {
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('user', {
        'id': state.userId,
        'name': state.userName,
        'color': state.userColor,
        'cursorPosition': position,
        'lastActive': Date.now()
      });
    }
  }, [state.userId, state.userName, state.userColor]);

  const updateMousePosition = useCallback((position: { x: number; y: number } | null) => {
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('user', {
        'id': state.userId,
        'name': state.userName,
        'color': state.userColor,
        'mousePosition': position,
        'lastActive': Date.now()
      });
    }
  }, [state.userId, state.userName, state.userColor]);

  const updateCurrentPath = useCallback((path: string | null) => {
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('user', {
        'id': state.userId,
        'name': state.userName,
        'color': state.userColor,
        'currentPath': path,
        'lastActive': Date.now()
      });
    }
  }, [state.userId, state.userName, state.userColor]);

  const updateMeta = useCallback((meta: Partial<CollaborationState['meta']>) => {
    if (!metaMapRef.current) {
      return;
    }
    if (meta.title !== undefined) {
      metaMapRef.current.set('title', meta.title);
    }
    if (meta.summary !== undefined) {
      metaMapRef.current.set('summary', meta.summary);
    }
    if (meta.tags !== undefined) {
      metaMapRef.current.set('tags', meta.tags);
    }
    if (meta.coverImage !== undefined) {
      metaMapRef.current.set('coverImage', meta.coverImage);
    }
  }, []);

  const value = useMemo<CollaborationContextValue>(() => ({
    ...state,
    doc,
    provider,
    connect,
    disconnect,
    setUserName,
    setUserColor,
    sendMessage,
    updateCursorPosition,
    updateMeta,
    updateMousePosition,
    updateCurrentPath
  }), [state, doc, provider, connect, disconnect, setUserName, setUserColor, sendMessage, updateCursorPosition, updateMeta, updateMousePosition, updateCurrentPath]);

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export { CollaborationContext };
