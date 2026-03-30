import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCollaboration } from '../collaboration';

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
  const { collaborators } = useCollaboration();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const prevCollaboratorsRef = useRef<Map<string, CollaboratorState>>(new Map());
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
    const prevCollaborators = prevCollaboratorsRef.current;
    const currentPath = location.pathname;

    collaborators.forEach((collaborator) => {
      const prevState = prevCollaborators.get(collaborator.id);

      if (prevState && prevState.currentPath === currentPath && collaborator.currentPath !== currentPath) {
        createToast(collaborator.name, collaborator.color, collaborator.id);
      }

      prevCollaborators.set(collaborator.id, {
        'name': collaborator.name,
        'color': collaborator.color,
        'currentPath': collaborator.currentPath ?? null
      });
    });

    collaborators.forEach((collaborator) => {
      if (!prevCollaborators.has(collaborator.id)) {
        prevCollaborators.set(collaborator.id, {
          'name': collaborator.name,
          'color': collaborator.color,
          'currentPath': collaborator.currentPath ?? null
        });
      }
    });
  }, [collaborators, location.pathname, createToast]);

  useEffect(() => {
    const timeoutMap = timeoutMapRef.current;
    return () => {
      timeoutMap.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  if (toasts.length === 0) {
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
