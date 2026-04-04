import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOthersMapped, useOthersConnectionIds, shallow } from '../liveblocks.config';
import { cursorManager, type CursorData } from './CursorManager';

const springConfig = {
  'type': 'spring' as const,
  'bounce': 0.6,
  'damping': 30,
  'mass': 0.8,
  'stiffness': 350,
  'restSpeed': 0.01
};

interface RemoteCursor {
  x: number;
  y: number;
  userName: string;
  userColor: string;
  currentPath: string | null;
}

function Cursor ({
  x,
  y,
  userName,
  userColor
}: {
  x: number;
  y: number;
  userName: string;
  userColor: string;
}) {
  return (
    <motion.div
      className="fixed pointer-events-none z-[9998]"
      initial={{ x, y }}
      animate={{ x, y }}
      transition={springConfig}
      style={{ 'top': 0, 'left': 0 }}
    >
      <svg
        width="32"
        height="44"
        viewBox="0 0 24 36"
        fill="none"
        style={{ 'transform': 'translate(-2px, -2px)' }}
      >
        <defs>
          <linearGradient id={`gradient-${userName}`} x1="0%" y1="0%" x2="500%" y2="0%">
            <stop offset="0%" stopColor={userColor} />
            <stop offset="100%" stopColor={userColor} />
          </linearGradient>
        </defs>
        <path
          fill={`url(#gradient-${userName})`}
          d="M0.928548 2.18278C0.619075 1.37094 1.42087 0.577818 2.2293 0.896107L14.3863 5.68247C15.2271 6.0135 15.2325 7.20148 14.3947 7.54008L9.85984 9.373C9.61167 9.47331 9.41408 9.66891 9.31127 9.91604L7.43907 14.4165C7.09186 15.2511 5.90335 15.2333 5.58136 14.3886L0.928548 2.18278Z"
        />
      </svg>
      <div
        className="absolute top-3 left-4 px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap shadow-lg"
        style={{ 'backgroundColor': userColor }}
      >
        {userName}
      </div>
    </motion.div>
  );
}

export function Cursors () {
  const [remoteCursors, setRemoteCursors] = useState<Map<number, RemoteCursor>>(new Map());
  const location = useLocation();
  const currentPath = location.pathname;

  const connectionIds = useOthersConnectionIds();
  const others = useOthersMapped(
    (other) => ({
      'peerId': other.presence?.peerId ?? null,
      'userName': other.presence?.userName ?? 'Anonymous',
      'userColor': other.presence?.userColor ?? '#888888',
      'currentPath': other.presence?.currentPath ?? null
    }),
    shallow
  );

  const previousPeersRef = useRef<Map<number, string>>(new Map());
  const myPeerIdRef = useRef<string | null>(null);

  const handleCursorUpdate = useCallback((connectionId: number, data: CursorData) => {
    setRemoteCursors((prev) => {
      const next = new Map(prev);
      next.set(connectionId, {
        'x': data.x,
        'y': data.y,
        'userName': data.userName,
        'userColor': data.userColor,
        'currentPath': data.currentPath
      });
      return next;
    });
  }, []);

  const handlePeerDisconnected = useCallback((connectionId: number) => {
    setRemoteCursors((prev) => {
      const next = new Map(prev);
      next.delete(connectionId);
      return next;
    });
  }, []);

  useEffect(() => {
    cursorManager.setCallbacks(handleCursorUpdate, handlePeerDisconnected);
  }, [handleCursorUpdate, handlePeerDisconnected]);

  useEffect(() => {
    cursorManager.updateUserData(undefined, undefined, currentPath);
  }, [currentPath]);

  useEffect(() => {
    const currentPeers = new Map<number, string>();

    for (const [connectionId, data] of others) {
      if (data.peerId) {
        currentPeers.set(connectionId, data.peerId);
      }
    }

    for (const [connectionId, peerId] of currentPeers) {
      const prevPeerId = previousPeersRef.current.get(connectionId);

      if (prevPeerId !== peerId) {
        if (prevPeerId) {
          cursorManager.disconnectFromPeer(connectionId);
        }

        if (peerId !== myPeerIdRef.current) {
          cursorManager.connectToPeer(connectionId, peerId);
        }
      }
    }

    for (const [connectionId] of previousPeersRef.current) {
      if (!currentPeers.has(connectionId)) {
        cursorManager.disconnectFromPeer(connectionId);
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.delete(connectionId);
          return next;
        });
      }
    }

    previousPeersRef.current = currentPeers;
  }, [others, connectionIds]);

  useEffect(() => {
    myPeerIdRef.current = cursorManager.getPeerId();
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      cursorManager.sendCursorUpdate(e.clientX, e.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <>
      {Array.from(remoteCursors.entries())
        .filter(([, cursor]) => cursor.currentPath === currentPath)
        .map(([connectionId, cursor]) => (
          <Cursor
            key={connectionId}
            x={cursor.x}
            y={cursor.y}
            userName={cursor.userName}
            userColor={cursor.userColor}
          />
        ))}
    </>
  );
}
