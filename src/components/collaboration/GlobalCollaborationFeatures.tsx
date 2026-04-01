import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCollaboration, RemoteCursors } from '../collaboration';
import { PageLeaveToast } from './PageLeaveToast';
import { useUpdateMyPresence } from './liveblocks.config';

const GlobalMouseTracker: React.FC = () => {
  const { isConnected } = useCollaboration();
  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    if (!isConnected) {
      return undefined;
    }

    const handlePointerMove = (e: PointerEvent) => {
      updateMyPresence({ 'cursor': { 'x': e.clientX, 'y': e.clientY } });
    };

    const handlePointerLeave = () => {
      updateMyPresence({ 'cursor': null });
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
      updateMyPresence({ 'cursor': null });
    };
  }, [isConnected, updateMyPresence]);

  return null;
};

const PageTracker: React.FC = () => {
  const { isConnected } = useCollaboration();
  const location = useLocation();
  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    updateMyPresence({ 'currentPath': location.pathname });
  }, [location.pathname, isConnected, updateMyPresence]);

  return null;
};

export const GlobalCollaborationFeatures: React.FC = () => {
  const { isConnected, userName, userColor } = useCollaboration();
  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    if (isConnected) {
      updateMyPresence({
        userName,
        userColor
      });
    }
  }, [isConnected, userName, userColor, updateMyPresence]);

  if (!isConnected) {
    return null;
  }

  return (
    <>
      <GlobalMouseTracker />
      <PageTracker />
      <RemoteCursors />
      <PageLeaveToast />
    </>
  );
};
