import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { getYjsProviderForRoom, type LiveblocksYjsProvider } from '@liveblocks/yjs';
import { RoomProvider, useRoom, useUpdateMyPresence, useOthers, useSelf, useStatus, LiveList, LiveObject, type Storage } from './liveblocks.config';
import {
  CollaborationContextValue,
  Collaborator,
  ConnectionStatus,
  RecentRoom,
  ArticleMetadataMaps
} from './types';
import { useCollaborationSettings } from './internal/settings';
import { CollaborationContext } from './ContextDef';
import { cursorManager } from './internal/CursorManager';
import { getRooms } from './internal/api';

interface CollaborationProviderProps {
  children: React.ReactNode;
}

function CollaborationRoomInner ({
  children,
  userName,
  userColor,
  roomId,
  onDisconnect,
  setUserName,
  setUserColor,
  isPanelOpen,
  setPanelOpen,
  recentRooms,
  isLoadingRooms,
  refreshRooms,
  inputRoomId,
  setInputRoomId
}: {
  children: React.ReactNode;
  userName: string;
  userColor: string;
  roomId: string;
  onDisconnect: () => void;
  setUserName: (name: string) => void;
  setUserColor: (color: string) => void;
  isPanelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  recentRooms: RecentRoom[];
  isLoadingRooms: boolean;
  refreshRooms: () => Promise<void>;
  inputRoomId: string;
  setInputRoomId: (roomId: string) => void;
}) {
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  const self = useSelf();
  const status = useStatus();
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<LiveblocksYjsProvider | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [articleMetadata, setArticleMetadata] = useState<ArticleMetadataMaps | null>(null);

  const retryCountRef = useRef(0);
  const maxRetriesRef = useRef(5);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;

    const initWebRTC = async () => {
      if (!mounted) {
        return;
      }

      try {
        const id = await cursorManager.initialize(userName, userColor);
        if (mounted) {
          setPeerId(id);
          retryCountRef.current = 0;
          updateMyPresence({ 'peerId': id });
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        console.error('Failed to initialize WebRTC:', error);
        retryCountRef.current += 1;

        if (retryCountRef.current < maxRetriesRef.current) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000);
          console.log(`Retrying WebRTC initialization in ${delay}ms (attempt ${retryCountRef.current}/${maxRetriesRef.current})`);
          retryTimeout = setTimeout(initWebRTC, delay);
        } else {
          console.error('Max WebRTC initialization retries reached');
        }
      }
    };

    initWebRTC();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      cursorManager.release();
    };
  }, [userName, userColor, updateMyPresence]);

  useEffect(() => {
    if (peerId) {
      cursorManager.updateUserData(userName, userColor, undefined);
    }
  }, [userName, userColor, peerId]);

  useEffect(() => {
    updateMyPresence({
      'cursor': null,
      'currentPath': null,
      userName,
      userColor
    });
  }, [updateMyPresence, userName, userColor]);

  useEffect(() => {
    const yjsProvider = getYjsProviderForRoom(
      room as unknown as Parameters<typeof getYjsProviderForRoom>[0],
      { 'offlineSupport_experimental': true }
    );

    const yDoc = yjsProvider.getYDoc();

    queueMicrotask(() => {
      setProvider(yjsProvider);
      setDoc(yDoc);

      const titleMap = yDoc.getMap<string>('article-title');
      const summaryMap = yDoc.getMap<string>('article-summary');
      const tagsArray = yDoc.getArray<string>('article-tags');
      const coverImageMap = yDoc.getMap<string | null>('article-coverImage');

      setArticleMetadata({
        'title': titleMap,
        'summary': summaryMap,
        'tags': tagsArray,
        'coverImage': coverImageMap
      });

      const awareness = yjsProvider.awareness;
      if (awareness) {
        awareness.setLocalStateField('user', {
          'name': userName,
          'color': userColor
        });
      }

      yjsProvider.on('sync', () => {
        const syncedAwareness = yjsProvider.awareness;
        if (syncedAwareness) {
          syncedAwareness.setLocalStateField('user', {
            'name': userName,
            'color': userColor
          });
        }
      });
    });

    return () => {
      yjsProvider.destroy();
      queueMicrotask(() => {
        setProvider(null);
        setDoc(null);
        setArticleMetadata(null);
      });
    };
  }, [room, userName, userColor]);

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

  const value = useMemo<CollaborationContextValue>(() => ({
    'isConnected': connectionStatus === 'connected',
    'isConnecting': connectionStatus === 'connecting',
    connectionStatus,
    roomId,
    'userId': self ? String(self.connectionId) : null,
    userName,
    userColor,
    collaborators,
    doc,
    'provider': provider as unknown,
    'connect': () => {},
    'disconnect': onDisconnect,
    setUserName,
    setUserColor,
    isPanelOpen,
    setPanelOpen,
    recentRooms,
    isLoadingRooms,
    refreshRooms,
    inputRoomId,
    setInputRoomId,
    articleMetadata
  }), [
    connectionStatus, roomId, self, userName, userColor, collaborators,
    doc, provider, onDisconnect, setUserName, setUserColor, isPanelOpen, setPanelOpen, recentRooms, isLoadingRooms, refreshRooms, inputRoomId, setInputRoomId, articleMetadata
  ]);

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function CollaborationProvider ({ children }: CollaborationProviderProps) {
  const {
    'userName': savedUserName,
    'userColor': savedUserColor,
    'setUserName': saveUserName,
    'setUserColor': saveUserColor
  } = useCollaborationSettings();

  const userName = savedUserName;
  const userColor = savedUserColor;

  const [roomId, setRoomId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [inputRoomId, setInputRoomId] = useState('');

  const refreshRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const rooms = await getRooms(20);
      setRecentRooms(rooms);
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);

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

  const setPanelOpen = useCallback((open: boolean) => {
    setIsPanelOpen(open);
  }, []);

  const contextValue = useMemo<CollaborationContextValue>(() => ({
    'isConnected': false,
    'isConnecting': false,
    'connectionStatus': 'disconnected',
    'roomId': null,
    'userId': null,
    userName,
    userColor,
    'collaborators': [],
    'doc': null,
    'provider': null,
    connect,
    disconnect,
    setUserName,
    setUserColor,
    isPanelOpen,
    setPanelOpen,
    recentRooms,
    isLoadingRooms,
    refreshRooms,
    inputRoomId,
    setInputRoomId,
    'articleMetadata': null
  }), [userName, userColor, connect, disconnect, setUserName, setUserColor, isPanelOpen, setPanelOpen, recentRooms, isLoadingRooms, refreshRooms, inputRoomId]);

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
        userColor,
        'peerId': null
      }}
      initialStorage={{
        'channels': new LiveList([new LiveObject({
          'id': 'main',
          'name': '主聊天',
          'isDefault': true
        })]),
        'messages': new LiveList([]),
        'threads': new LiveList([]),
        'pinnedMessages': new LiveList([]),
        'articleMetadata': new LiveObject({
          'title': '',
          'summary': '',
          'tags': [],
          'coverImage': null
        })
      } as Storage}
    >
      <CollaborationRoomInner
        userName={userName}
        userColor={userColor}
        roomId={roomId}
        onDisconnect={disconnect}
        setUserName={setUserName}
        setUserColor={setUserColor}
        isPanelOpen={isPanelOpen}
        setPanelOpen={setPanelOpen}
        recentRooms={recentRooms}
        isLoadingRooms={isLoadingRooms}
        refreshRooms={refreshRooms}
        inputRoomId={inputRoomId}
        setInputRoomId={setInputRoomId}
      >
        {children}
      </CollaborationRoomInner>
    </RoomProvider>
  );
}
