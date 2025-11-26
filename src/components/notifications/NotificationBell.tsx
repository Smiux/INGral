import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';
import styles from './NotificationBell.module.css';

interface NotificationBellProps {
  userId: string | null;
  className?: string;
}

interface NotificationBellRef {
  refresh: () => Promise<void>;
}

const NotificationBell = forwardRef<NotificationBellRef, NotificationBellProps>(({ userId, className = '' }, ref) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // 获取未读通知数量
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const count = await notificationService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (err) {
      console.error('获取未读通知数量失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 点击通知图标跳转到通知页面
  const handleClick = () => {
    if (!userId) return;
    navigate('/notifications');
  };

  // 初始加载和userId变化时获取未读数量
  useEffect(() => {
    fetchUnreadCount();
  }, [userId, fetchUnreadCount]);

  // 每30秒刷新一次未读数量
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, fetchUnreadCount]);

  // 暴露给父组件的刷新方法
  useImperativeHandle(
    ref,
    () => ({
      refresh: fetchUnreadCount
    }),
    [fetchUnreadCount]
  );

  if (!userId) {
    return (
      <button className={`${styles.button} ${className}`} disabled>
        <BellOff className={styles.icon} />
      </button>
    );
  }

  return (
    <button
      className={`${styles.button} ${className}`}
      onClick={handleClick}
      title="查看通知"
      disabled={isLoading}
    >
      <Bell className={styles.icon} />
      {unreadCount > 0 && (
        <span className={styles.badge}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
});

// 使用命名导出而不是默认导出，以符合ESLint的react-refresh/only-export-components规则
export { NotificationBell };
