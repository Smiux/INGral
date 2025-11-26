import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, MessageCircle, RefreshCcw, UserPlus, Trash2 } from 'lucide-react';
import { NotificationWithActor } from '../../types/notification';
import notificationService from '../../services/notificationService';
import styles from './NotificationList.module.css';

interface NotificationListProps {
  userId: string;
}

const NotificationList: React.FC<NotificationListProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const navigate = useNavigate();

  // 获取通知列表
  const fetchNotifications = useCallback(async (loadMore: boolean = false) => {
    try {
      if (loadMore) {
        setIsLoading(true);
      }

      const newOffset = loadMore ? offset : 0;
      const result = await notificationService.getUserNotifications(userId, 20, newOffset);

      if (loadMore) {
        setNotifications(prev => [...prev, ...result]);
        setHasMore(result.length === 20);
      } else {
        setNotifications(result);
        setHasMore(result.length === 20);
      }

      if (!loadMore) {
        setOffset(20);
      } else {
        setOffset(prev => prev + 20);
      }

      setError(null);
    } catch (err) {
      console.error('获取通知列表失败:', err);
      setError('获取通知列表失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [userId, offset]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchNotifications(true);
    }
  }, [isLoading, hasMore, fetchNotifications]);

  // 标记为已读
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      const success = await notificationService.markAsRead(notificationId, userId);
      if (success) {
        setNotifications(prev => prev.map(notification => 
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        ));
      }
    } catch (err) {
      console.error('标记通知已读失败:', err);
    }
  }, [userId]);

  // 标记全部已读
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const success = await notificationService.markAllAsRead(userId);
      if (success) {
        setNotifications(prev => prev.map(notification => ({ ...notification, is_read: true })));
      }
    } catch (err) {
      console.error('标记全部已读失败:', err);
    }
  }, [userId]);

  // 删除通知
  const handleDelete = useCallback(async (notificationId: string) => {
    try {
      const success = await notificationService.deleteNotification(notificationId, userId);
      if (success) {
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
      }
    } catch (err) {
      console.error('删除通知失败:', err);
    }
  }, [userId]);

  // 点击通知
  const handleNotificationClick = useCallback((notification: NotificationWithActor) => {
    // 标记为已读
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // 根据通知类型跳转到相应页面
    switch (notification.notification_type) {
      case 'comment':
        if (notification.reference_id) {
          navigate(`/article/${notification.reference_id}#comments`);
        }
        break;
      case 'article_update':
        if (notification.reference_id) {
          navigate(`/article/${notification.reference_id}`);
        }
        break;
      case 'mention':
        if (notification.reference_id) {
          navigate(`/article/${notification.reference_id}`);
        }
        break;
      default:
        break;
    }
  }, [navigate, handleMarkAsRead]);

  // 获取通知图标
  const getNotificationIcon = useCallback((type: string, isRead: boolean) => {
    const iconProps = {
      className: `${styles.notificationIcon} ${!isRead ? styles.unreadIcon : ''}`
    };

    switch (type) {
      case 'comment':
        return <MessageCircle {...iconProps} />;
      case 'article_update':
        return <RefreshCcw {...iconProps} />;
      case 'mention':
        return <UserPlus {...iconProps} />;
      case 'system':
        return <Bell {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, userId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>通知</h2>
        <button
          className={styles.markAllButton}
          onClick={handleMarkAllAsRead}
          disabled={notifications.length === 0}
        >
          全部标为已读
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => fetchNotifications()}>重试</button>
        </div>
      )}

      {isLoading && notifications.length === 0 ? (
        <div className={styles.loading}>加载中...</div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          <Bell className={styles.emptyIcon} />
          <p>暂无通知</p>
        </div>
      ) : (
        <>
          <div className={styles.notifications}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
              >
                <div className={styles.notificationContent} onClick={() => handleNotificationClick(notification)}>
                  {getNotificationIcon(notification.notification_type, notification.is_read)}
                  <div className={styles.textContent}>
                    <div className={styles.actorInfo}>
                      {notification.actor && (
                        <span className={styles.actorName}>{notification.actor.username}</span>
                      )}
                      <span className={styles.content}>{notification.content}</span>
                    </div>
                    <div className={styles.timeInfo}>
                      {new Date(notification.created_at).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <div className={styles.actions}>
                  {!notification.is_read && (
                    <button
                      className={styles.actionButton}
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="标记为已读"
                    >
                      <CheckCircle className={styles.actionIcon} />
                    </button>
                  )}
                  <button
                    className={styles.actionButton}
                    onClick={() => handleDelete(notification.id)}
                    title="删除"
                  >
                    <Trash2 className={styles.actionIcon} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              className={styles.loadMoreButton}
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading ? '加载中...' : '加载更多'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

// 使用命名导出而不是默认导出，以符合ESLint的react-refresh/only-export-components规则
export { NotificationList };
