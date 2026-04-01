import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import * as Y from 'yjs';
import { getYjsProviderForRoom, type LiveblocksYjsProvider } from '@liveblocks/yjs';
import { LiveList, LiveMap } from '@liveblocks/client';
import { RoomProvider, useRoom, useUpdateMyPresence, useOthers, useStatus, type Storage } from './liveblocks.config';
import {
  CollaborationContextValue,
  CollaborationState,
  Collaborator,
  ConnectionStatus
} from './types';
import { useCollaborationSettings } from './useCollaborationSettings';
import { CollaborationContext } from './CollaborationContextDef';

interface CollaborationProviderProps {
  children: React.ReactNode;
  externalUserName?: string;
  externalUserColor?: string;
}

function CollaborationRoomInner ({
  children,
  userName,
  userColor,
  userId,
  roomId,
  onDisconnect
}: {
  children: React.ReactNode;
  userName: string;
  userColor: string;
  userId: string;
  roomId: string;
  onDisconnect: () => void;
}) {
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  const status = useStatus();
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<LiveblocksYjsProvider | null>(null);
  const [meta, setMeta] = useState<CollaborationState['meta']>({
    'title': '',
    'summary': '',
    'tags': [],
    'coverImage': null
  });

  const metaMapRef = useRef<Y.Map<unknown> | null>(null);
  const localUpdateRef = useRef(false);

  useEffect(() => {
    updateMyPresence({
      'cursor': null,
      'currentPath': null
    });
  }, [updateMyPresence]);

  useEffect(() => {
    const yjsProvider = getYjsProviderForRoom(
      room as unknown as Parameters<typeof getYjsProviderForRoom>[0],
      { 'offlineSupport_experimental': true }
    );

    const yDoc = yjsProvider.getYDoc();

    metaMapRef.current = yDoc.getMap('meta');

    const handleMetaChange = () => {
      if (!metaMapRef.current) {
        return;
      }

      const title = metaMapRef.current.get('title') as string | undefined;
      const summary = metaMapRef.current.get('summary') as string | undefined;
      const tags = metaMapRef.current.get('tags') as string[] | undefined;
      const coverImage = metaMapRef.current.get('coverImage') as string | undefined;

      if (localUpdateRef.current) {
        return;
      }

      setMeta({
        'title': title ?? '',
        'summary': summary ?? '',
        'tags': tags ?? [],
        'coverImage': coverImage !== undefined ? coverImage : null
      });
    };

    metaMapRef.current.observe(handleMetaChange);

    const initialTitle = metaMapRef.current.get('title') as string | undefined;
    const initialSummary = metaMapRef.current.get('summary') as string | undefined;
    const initialTags = metaMapRef.current.get('tags') as string[] | undefined;
    const initialCoverImage = metaMapRef.current.get('coverImage') as string | undefined;

    if (initialTitle || initialSummary || (initialTags && initialTags.length > 0) || initialCoverImage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMeta({
        'title': initialTitle ?? '',
        'summary': initialSummary ?? '',
        'tags': initialTags ?? [],
        'coverImage': initialCoverImage ?? null
      });
    }

    queueMicrotask(() => {
      setProvider(yjsProvider);
      setDoc(yDoc);
    });

    return () => {
      metaMapRef.current?.unobserve(handleMetaChange);
      yjsProvider.destroy();
      queueMicrotask(() => {
        setProvider(null);
        setDoc(null);
      });
    };
  }, [room]);

  const collaborators = useMemo<Collaborator[]>(() => {
    return others.map((other) => ({
      'id': String(other.connectionId),
      'name': other.presence?.userName ?? 'Anonymous',
      'color': other.presence?.userColor ?? '#888888',
      'currentPath': other.presence?.currentPath ?? null
    }));
  }, [others]);

  const connectionStatus: ConnectionStatus = useMemo(() => {
    if (status === 'connected') {
      return 'connected';
    }
    if (status === 'reconnecting') {
      return 'reconnecting';
    }
    if (status === 'connecting') {
      return 'connecting';
    }
    return 'disconnected';
  }, [status]);

  const updateMeta = useCallback((newMeta: Partial<CollaborationState['meta']>) => {
    if (!metaMapRef.current) {
      return;
    }

    localUpdateRef.current = true;

    metaMapRef.current.doc?.transact(() => {
      if (newMeta.title !== undefined) {
        metaMapRef.current!.set('title', newMeta.title);
      }
      if (newMeta.summary !== undefined) {
        metaMapRef.current!.set('summary', newMeta.summary);
      }
      if (newMeta.tags !== undefined) {
        metaMapRef.current!.set('tags', newMeta.tags);
      }
      if (newMeta.coverImage !== undefined) {
        metaMapRef.current!.set('coverImage', newMeta.coverImage);
      }
    }, 'local');

    setMeta((prev) => ({
      'title': newMeta.title !== undefined ? newMeta.title : prev.title,
      'summary': newMeta.summary !== undefined ? newMeta.summary : prev.summary,
      'tags': newMeta.tags !== undefined ? newMeta.tags : prev.tags,
      'coverImage': newMeta.coverImage !== undefined ? newMeta.coverImage : prev.coverImage
    }));

    queueMicrotask(() => {
      localUpdateRef.current = false;
    });
  }, []);

  const updateCurrentPath = useCallback((path: string | null) => {
    updateMyPresence({ 'currentPath': path });
  }, [updateMyPresence]);

  const value = useMemo<CollaborationContextValue>(() => ({
    'isConnected': connectionStatus === 'connected',
    'isConnecting': connectionStatus === 'connecting',
    connectionStatus,
    roomId,
    userName,
    userId,
    userColor,
    collaborators,
    'messages': [],
    'error': null,
    meta,
    doc,
    'provider': provider as unknown,
    'connect': () => {},
    'disconnect': onDisconnect,
    'setUserName': () => {},
    'setUserColor': () => {},
    'sendMessage': () => {},
    'updateCursorPosition': () => {},
    updateMeta,
    'updateMousePosition': () => {},
    updateCurrentPath
  }), [
    connectionStatus, roomId, userName, userId, userColor, collaborators,
    meta, doc, provider, onDisconnect,
    updateMeta, updateCurrentPath
  ]);

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

let globalUserId: string | null = null;

function generateUserId (): string {
  if (!globalUserId) {
    globalUserId = `user-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }
  return globalUserId;
}

export function CollaborationProvider ({
  children,
  externalUserName,
  externalUserColor
}: CollaborationProviderProps) {
  const {
    'userName': savedUserName,
    'userColor': savedUserColor,
    'setUserName': saveUserName,
    'setUserColor': saveUserColor
  } = useCollaborationSettings();

  const userName = externalUserName ?? savedUserName;
  const userColor = externalUserColor ?? savedUserColor;
  const userId = useMemo(() => generateUserId(), []);

  const [roomId, setRoomId] = useState<string | null>(null);

  const connect = useCallback((newRoomId: string) => {
    setRoomId(newRoomId);
  }, []);

  const disconnect = useCallback(() => {
    setRoomId(null);
  }, []);

  const setUserName = useCallback((name: string) => {
    saveUserName(name);
  }, [saveUserName]);

  const setUserColor = useCallback((color: string) => {
    saveUserColor(color);
  }, [saveUserColor]);

  const contextValue = useMemo<CollaborationContextValue>(() => ({
    'isConnected': false,
    'isConnecting': false,
    'connectionStatus': 'disconnected',
    'roomId': null,
    userName,
    userId,
    userColor,
    'collaborators': [],
    'messages': [],
    'error': null,
    'meta': {
      'title': '',
      'summary': '',
      'tags': [],
      'coverImage': null
    },
    'doc': null,
    'provider': null,
    connect,
    disconnect,
    setUserName,
    setUserColor,
    'sendMessage': () => {},
    'updateMeta': () => {},
    'updateCurrentPath': () => {}
  }), [userName, userId, userColor, connect, disconnect, setUserName, setUserColor]);

  if (!roomId) {
    return (
      <CollaborationContext.Provider value={contextValue}>
        {children}
      </CollaborationContext.Provider>
    );
  }

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        'cursor': null,
        'currentPath': null,
        userName,
        userColor
      }}
      initialStorage={{ 'messages': new LiveList([]), 'threads': new LiveMap(), 'mainThreadTitle': '主聊天' } as Storage}
    >
      <CollaborationRoomInner
        userName={userName}
        userColor={userColor}
        userId={userId}
        roomId={roomId}
        onDisconnect={disconnect}
      >
        {children}
      </CollaborationRoomInner>
    </RoomProvider>
  );
}
