import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import notificationService from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // 获取未读通知数量
  const refreshUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('获取未读通知数量失败:', error);
    }
  };

  // 标记通知为已读
  const markAsRead = async (notificationId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await notificationService.markAsRead(notificationId, user.id);
      if (success && unreadCount > 0) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return success;
    } catch (error) {
      console.error('标记通知已读失败:', error);
      return false;
    }
  };

  // 标记所有通知为已读
  const markAllAsRead = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await notificationService.markAllAsRead(user.id);
      if (success) {
        setUnreadCount(0);
      }
      return success;
    } catch (error) {
      console.error('标记所有通知已读失败:', error);
      return false;
    }
  };

  // 当用户变化时，刷新未读通知数量
  useEffect(() => {
    refreshUnreadCount();
  }, [user]);

  // 定期刷新未读通知数量
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 60000); // 每分钟刷新一次

    return () => clearInterval(interval);
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
