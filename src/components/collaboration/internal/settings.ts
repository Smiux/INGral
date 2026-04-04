import { useState, useCallback, useEffect } from 'react';
import { getRandomColor } from '../types';

const STORAGE_KEY_USER_NAME = 'collaboration_user_name';
const STORAGE_KEY_USER_COLOR = 'collaboration_user_color';

interface CollaborationSettings {
  userName: string;
  userColor: string;
}

export function useCollaborationSettings () {
  const [settings, setSettings] = useState<CollaborationSettings>(() => {
    const savedUserName = localStorage.getItem(STORAGE_KEY_USER_NAME);
    const savedUserColor = localStorage.getItem(STORAGE_KEY_USER_COLOR);

    return {
      'userName': savedUserName || `用户${Math.floor(Math.random() * 10000)}`,
      'userColor': savedUserColor || getRandomColor()
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USER_NAME, settings.userName);
    localStorage.setItem(STORAGE_KEY_USER_COLOR, settings.userColor);
  }, [settings]);

  const setUserName = useCallback((name: string) => {
    setSettings((prev) => ({ ...prev, 'userName': name }));
  }, []);

  const setUserColor = useCallback((color: string) => {
    setSettings((prev) => ({ ...prev, 'userColor': color }));
  }, []);

  const resetUserName = useCallback(() => {
    const newName = `用户${Math.floor(Math.random() * 10000)}`;
    setSettings((prev) => ({ ...prev, 'userName': newName }));
  }, []);

  const resetUserColor = useCallback(() => {
    setSettings((prev) => ({ ...prev, 'userColor': getRandomColor() }));
  }, []);

  return {
    'userName': settings.userName,
    'userColor': settings.userColor,
    setUserName,
    setUserColor,
    resetUserName,
    resetUserColor
  };
}
