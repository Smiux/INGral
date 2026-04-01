import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCollaboration } from '../collaboration';
import { useOthers } from './liveblocks.config';

interface ToastMessage {
  id: string;
  userName: string;
  userColor: string;
  message: string;
}

interface CollaboratorState {
  name: string;
  color: string;
  currentPath: string | null;
}

const PageLeaveToast: React.FC = () => {
  const location = useLocation();
  const { isConnected } = useCollaboration();
  const others = useOthers();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const prevCollaboratorsRef = useRef<Map<number, CollaboratorState>>(new Map());
  const timeoutMapRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((t) => t.id !== toastId));
    timeoutMapRef.current.delete(toastId);
  }, []);

  const createToast = useCallback((userName: string, userColor: string, collaboratorId: string) => {
    const toast: ToastMessage = {
      'id': `left-${collaboratorId}-${Date.now()}`,
      userName,
      userColor,
      'message': `'${userName}' 离开了此页面`
    };
    setToasts((prev) => [...prev, toast]);
    const timeout = setTimeout(() => {
      removeToast(toast.id);
    }, 3000);
    timeoutMapRef.current.set(toast.id, timeout);
  }, [removeToast]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const prevCollaborators = prevCollaboratorsRef.current;
    const currentPath = location.pathname;

    others.forEach((other) => {
      const prevState = prevCollaborators.get(other.connectionId);
      const otherPath = other.presence?.currentPath ?? null;
      const otherName = other.presence?.userName ?? 'Anonymous';
      const otherColor = other.presence?.userColor ?? '#888888';

      if (prevState && prevState.currentPath === currentPath && otherPath !== currentPath) {
        createToast(otherName, otherColor, String(other.connectionId));
      }

      prevCollaborators.set(other.connectionId, {
        'name': otherName,
        'color': otherColor,
        'currentPath': otherPath
      });
    });

    others.forEach((other) => {
      if (!prevCollaborators.has(other.connectionId)) {
        prevCollaborators.set(other.connectionId, {
          'name': other.presence?.userName ?? 'Anonymous',
          'color': other.presence?.userColor ?? '#888888',
          'currentPath': other.presence?.currentPath ?? null
        });
      }
    });
  }, [others, location.pathname, isConnected, createToast]);

  useEffect(() => {
    const timeoutMap = timeoutMapRef.current;
    return () => {
      timeoutMap.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  if (!isConnected || toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right fade-in duration-300"
          style={{
            'backgroundColor': toast.userColor,
            'color': 'white'
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export { PageLeaveToast };
