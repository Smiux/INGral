import { useContext } from 'react';
import { NotificationContext } from './NotificationContext';

/**
 * Hook for accessing notification functionality
 * @returns Notification context methods and state
 * @throws Error if used outside NotificationProvider
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

/**
 * Notification context type
 */
export interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
}
