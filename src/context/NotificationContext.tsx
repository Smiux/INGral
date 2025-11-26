/**
 * 通知上下文
 * 提供应用内通知的管理和状态
 */
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import notificationService from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';
import { type NotificationContextType } from './notificationUtils';

/**
 * 通知上下文对象
 */
export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * 通知提供者属性接口
 */
interface NotificationProviderProps {
  /** 子组件 */
  children: ReactNode;
}

/**
 * 通知提供者组件
 * 管理应用内通知的状态和操作
 * @param props - 组件属性
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * 刷新未读通知数量
   */
  const refreshUnreadCount = useCallback(async () => {
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
  }, [user]);

  /**
   * 标记单个通知为已读
   * @param notificationId - 通知ID
   * @returns 是否成功标记
   */
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
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
  }, [user, unreadCount]);

  /**
   * 标记所有通知为已读
   * @returns 是否成功标记
   */
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
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
  }, [user]);

  /**
   * 当用户变化时，刷新未读通知数量
   */
  useEffect(() => {
    refreshUnreadCount();
  }, [user, refreshUnreadCount]);

  /**
   * 定期刷新未读通知数量（每分钟一次）
   */
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 60000); // 每分钟刷新一次

    return () => clearInterval(interval);
  }, [user, refreshUnreadCount]);

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
