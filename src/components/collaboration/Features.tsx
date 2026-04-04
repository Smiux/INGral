import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCollaboration } from './ContextDef';
import { Cursors } from './internal/Cursors';
import { Notifier } from './internal/Notifier';
import { useUpdateMyPresence } from './liveblocks.config';

const PageTracker = () => {
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

export const Features = ({ className = '' }: { className?: string }) => {
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
    <div className={className}>
      <PageTracker />
      <Cursors />
      <Notifier />
    </div>
  );
};
