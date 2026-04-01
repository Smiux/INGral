import React, { memo, useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useOthersConnectionIds, useOther, useMyPresence } from './liveblocks.config';

interface CursorProps {
  connectionId: number;
  currentPath: string;
}

const Cursor = memo<CursorProps>(({ connectionId, currentPath }) => {
  const cursorData = useOther(connectionId, (other) => ({
    'cursor': other.presence?.cursor ?? null,
    'currentPath': other.presence?.currentPath ?? null,
    'userName': other.presence?.userName ?? 'Anonymous',
    'userColor': other.presence?.userColor ?? '#888888'
  }));

  const [displayPosition, setDisplayPosition] = useState<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const targetPositionRef = useRef<{ x: number; y: number } | null>(null);
  const currentPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!cursorData.cursor) {
      return;
    }

    targetPositionRef.current = { 'x': cursorData.cursor.x, 'y': cursorData.cursor.y };

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      currentPositionRef.current = { 'x': cursorData.cursor.x, 'y': cursorData.cursor.y };
      queueMicrotask(() => {
        setDisplayPosition({ 'x': cursorData.cursor!.x, 'y': cursorData.cursor!.y });
      });
    }
  }, [cursorData.cursor]);

  useEffect(() => {
    const animate = () => {
      if (!targetPositionRef.current || !currentPositionRef.current) {
        return;
      }

      const target = targetPositionRef.current;
      const current = currentPositionRef.current;

      const dx = target.x - current.x;
      const dy = target.y - current.y;

      const lerp = 0.2;
      const newX = current.x + dx * lerp;
      const newY = current.y + dy * lerp;

      currentPositionRef.current = { 'x': newX, 'y': newY };
      setDisplayPosition({ 'x': newX, 'y': newY });

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (targetPositionRef.current && currentPositionRef.current) {
      const target = targetPositionRef.current;
      const current = currentPositionRef.current;
      const dx = target.x - current.x;
      const dy = target.y - current.y;

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cursorData.cursor]);

  if (!cursorData.cursor || cursorData.currentPath !== currentPath || !displayPosition) {
    return null;
  }

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        'transform': `translate(${displayPosition.x - 2}px, ${displayPosition.y - 2}px)`
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-md"
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.94 2.36a.5.5 0 0 0-.44.85z"
          fill={cursorData.userColor}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="absolute left-4 top-4 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap shadow-sm"
        style={{
          'backgroundColor': cursorData.userColor,
          'color': 'white'
        }}
      >
        {cursorData.userName}
      </div>
    </div>
  );
});

Cursor.displayName = 'Cursor';

export const RemoteCursors: React.FC = () => {
  const connectionIds = useOthersConnectionIds();
  const location = useLocation();
  const [myPresence] = useMyPresence();

  if (!myPresence.userName) {
    return null;
  }

  return (
    <>
      {connectionIds.map((connectionId) => (
        <Cursor
          key={connectionId}
          connectionId={connectionId}
          currentPath={location.pathname}
        />
      ))}
    </>
  );
};
