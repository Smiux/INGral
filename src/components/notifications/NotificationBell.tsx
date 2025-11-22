import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';
import styles from './NotificationBell.module.css';

interface NotificationBellProps {
  userId: string | null;
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId, className = '' }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // 获取未读通知数量
  const fetchUnreadCount = async () => {
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
  };

  // 点击通知图标跳转到通知页面
  const handleClick = () => {
    if (!userId) return;
    navigate('/notifications');
  };

  // 初始加载和userId变化时获取未读数量
  useEffect(() => {
    fetchUnreadCount();
  }, [userId]);

  // 每30秒刷新一次未读数量
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  // 暴露给父组件的刷新方法
  React.useImperativeHandle(
    null,
    () => ({
      refresh: fetchUnreadCount
    })
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
};

export default NotificationBell;
