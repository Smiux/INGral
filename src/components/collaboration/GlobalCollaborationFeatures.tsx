import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCollaboration, RemoteCursors } from '../collaboration';
import { PageLeaveToast } from './PageLeaveToast';

const GlobalMouseTracker: React.FC = () => {
  const collaboration = useCollaboration();
  const updateMousePositionRef = useRef<(position: { x: number; y: number } | null) => void>(() => {});

  useEffect(() => {
    updateMousePositionRef.current = collaboration.updateMousePosition;
  }, [collaboration.updateMousePosition]);

  useEffect(() => {
    if (!collaboration.isConnected) {
      return undefined;
    }

    const handleMouseMove = (e: MouseEvent) => {
      updateMousePositionRef.current({ 'x': e.clientX, 'y': e.clientY });
    };

    const handleMouseLeave = () => {
      updateMousePositionRef.current(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      updateMousePositionRef.current(null);
    };
  }, [collaboration.isConnected]);

  return null;
};

const PageTracker: React.FC = () => {
  const location = useLocation();
  const collaboration = useCollaboration();
  const updateCurrentPathRef = useRef<(path: string | null) => void>(() => {});

  useEffect(() => {
    updateCurrentPathRef.current = collaboration.updateCurrentPath;
  }, [collaboration.updateCurrentPath]);

  useEffect(() => {
    if (!collaboration.isConnected) {
      return;
    }

    updateCurrentPathRef.current(location.pathname);
  }, [location.pathname, collaboration.isConnected]);

  return null;
};

export const GlobalCollaborationFeatures: React.FC = () => {
  return (
    <>
      <GlobalMouseTracker />
      <PageTracker />
      <RemoteCursors />
      <PageLeaveToast />
    </>
  );
};
