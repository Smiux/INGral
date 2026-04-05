import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useOthersMapped, useOthersConnectionIds, useSelf, shallow } from '../liveblocks.config';
import { Avatar } from './Avatar';

interface PreviousUserState {
  connectionId: number;
  userId: string;
  userName: string;
  userColor: string;
  currentPath: string | null;
  joinedAt: number;
}

interface UserActivityEvent {
  id: string;
  connectionId: number;
  userId: string;
  userName: string;
  userColor: string;
  timestamp: number;
  eventType: 'join' | 'leave_page' | 'leave_room';
}

interface ToastCardProps {
  notification: UserActivityEvent;
  onDismiss: (id: string) => void;
}

function ToastCard ({ notification, onDismiss }: ToastCardProps) {
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const DURATION = 3000;

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const handleDismiss = useCallback(() => {
    onDismiss(notification.id);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, [notification.id, onDismiss]);

  useEffect(() => {
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);

      if (remaining > 0) {
        timerRef.current = setTimeout(updateProgress, 16);
      }
    };

    timerRef.current = setTimeout(updateProgress, 16);

    timerRef.current = setTimeout(handleDismiss, DURATION);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [handleDismiss]);

  const getMessage = () => {
    switch (notification.eventType) {
      case 'join':
        return '加入了房间';
      case 'leave_room':
        return '离开了房间';
      case 'leave_page':
        return '离开了此页面';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ 'x': 400, 'opacity': 0 }}
      animate={{ 'x': 0, 'opacity': 1 }}
      exit={{ 'x': 400, 'opacity': 0 }}
      transition={{ 'type': 'spring', 'stiffness': 300, 'damping': 25 }}
      className="pointer-events-auto relative"
    >
      <div className="bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <Avatar
            userId={notification.userId}
            size={40}
            color={notification.userColor}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white">
              {notification.userName}
            </div>
            <div className="text-xs text-neutral-400">
              {getMessage()}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="h-1 bg-neutral-700 overflow-hidden">
          <motion.div
            className="h-full"
            initial={{ 'width': '100%' }}
            animate={{ 'width': `${progress}%` }}
            transition={{ 'duration': 0 }}
            style={{ 'backgroundColor': notification.userColor }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function Notifier () {
  const [notifications, setNotifications] = useState<UserActivityEvent[]>([]);
  const self = useSelf();
  const myJoinedAt = self?.presence?.joinedAt ?? 0;

  const connectionIds = useOthersConnectionIds();
  const othersMap = useOthersMapped(
    (other) => ({
      'userId': other.presence?.userId ?? String(other.connectionId),
      'userName': other.presence?.userName,
      'userColor': other.presence?.userColor,
      'currentPath': other.presence?.currentPath,
      'joinedAt': other.presence?.joinedAt ?? 0
    }),
    shallow
  );

  const previousUsersRef = useRef<PreviousUserState[]>([]);
  const knownConnectionIdsRef = useRef<Set<number>>(new Set());
  const processedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentConnectionIds = new Set(connectionIds);
    const currentUsersMap = new Map<number, PreviousUserState>();

    for (const [connectionId, data] of othersMap) {
      if (data.userName && data.userColor) {
        currentUsersMap.set(connectionId, {
          connectionId,
          'userId': data.userId,
          'userName': data.userName,
          'userColor': data.userColor,
          'currentPath': data.currentPath ?? null,
          'joinedAt': data.joinedAt
        });
      }
    }

    const newEvents: UserActivityEvent[] = [];

    const joinedUsers: PreviousUserState[] = [];
    for (const [connectionId, user] of currentUsersMap) {
      if (!knownConnectionIdsRef.current.has(connectionId)) {
        knownConnectionIdsRef.current.add(connectionId);
        if (user.joinedAt > myJoinedAt) {
          joinedUsers.push(user);
        }
      }
    }

    if (joinedUsers.length > 0) {
      newEvents.push(...joinedUsers.map((joinedUser) => {
        const eventId = `${joinedUser.connectionId}-${joinedUser.joinedAt}-join`;
        return {
          'id': eventId,
          'connectionId': joinedUser.connectionId,
          'userId': joinedUser.userId,
          'userName': joinedUser.userName,
          'userColor': joinedUser.userColor,
          'timestamp': Date.now(),
          'eventType': 'join' as const
        };
      }));
    }

    const leftRoomUsers: PreviousUserState[] = [];
    for (const prevUser of previousUsersRef.current) {
      const stillInRoom = currentConnectionIds.has(prevUser.connectionId);
      if (!stillInRoom) {
        leftRoomUsers.push(prevUser);
        knownConnectionIdsRef.current.delete(prevUser.connectionId);
      }
    }

    if (leftRoomUsers.length > 0) {
      newEvents.push(...leftRoomUsers.map((leftUser) => {
        const eventId = `${leftUser.connectionId}-${Date.now()}-room`;
        return {
          'id': eventId,
          'connectionId': leftUser.connectionId,
          'userId': leftUser.userId,
          'userName': leftUser.userName,
          'userColor': leftUser.userColor,
          'timestamp': Date.now(),
          'eventType': 'leave_room' as const
        };
      }));
    }

    const uniqueNewEvents = newEvents.filter((event) => {
      if (processedEventsRef.current.has(event.id)) {
        return false;
      }
      processedEventsRef.current.add(event.id);
      return true;
    });

    if (uniqueNewEvents.length > 0) {
      setNotifications((prev) => [...prev, ...uniqueNewEvents]);
    }

    previousUsersRef.current = Array.from(currentUsersMap.values());
  }, [connectionIds, othersMap, myJoinedAt]);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <ToastCard
            key={notification.id}
            notification={notification}
            onDismiss={handleDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
