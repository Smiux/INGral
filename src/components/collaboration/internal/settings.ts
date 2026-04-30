import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY_USER_ID = 'collaboration_user_id';
const STORAGE_KEY_USER_NAME = 'collaboration_user_name';
const STORAGE_KEY_USER_COLOR = 'collaboration_user_color';

function generateUserId (): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36)
    .substring(2, 15);
  const perfPart = (typeof performance !== 'undefined'
    ? performance.now().toString(36)
      .replace('.', '')
    : '');
  return `${timestamp}-${randomPart}-${perfPart}`;
}

function generateRandomColor (): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 65 + Math.floor(Math.random() * 20);
  const lightness = 45 + Math.floor(Math.random() * 10);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

interface CollaborationSettings {
  userId: string;
  userName: string;
  userColor: string;
}

export function useCollaborationSettings () {
  const [settings, setSettings] = useState<CollaborationSettings>(() => {
    const savedUserId = localStorage.getItem(STORAGE_KEY_USER_ID);
    const savedUserName = localStorage.getItem(STORAGE_KEY_USER_NAME);
    const savedUserColor = localStorage.getItem(STORAGE_KEY_USER_COLOR);

    return {
      'userId': savedUserId || generateUserId(),
      'userName': savedUserName || `用户${Math.floor(Math.random() * 10000)}`,
      'userColor': savedUserColor || generateRandomColor()
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER_ID, settings.userId);
    localStorage.setItem(STORAGE_KEY_USER_NAME, settings.userName);
    localStorage.setItem(STORAGE_KEY_USER_COLOR, settings.userColor);
  }, [settings]);

  const setUserName = useCallback((name: string) => {
    setSettings((prev) => ({ ...prev, 'userName': name }));
  }, []);

  const setUserColor = useCallback((color: string) => {
    setSettings((prev) => ({ ...prev, 'userColor': color }));
  }, []);

  return {
    'userId': settings.userId,
    'userName': settings.userName,
    'userColor': settings.userColor,
    setUserName,
    setUserColor
  };
}
