/**
 * 通知页面
 * 展示用户的通知列表
 */
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { NotificationList } from '../components/notifications/NotificationList';
import styles from './NotificationPage.module.css';

const NotificationPage: React.FC = () => {
  const { user } = useAuth();

  /**
   * 如果用户未登录，重定向到登录页面
   */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <NotificationList userId={user.id} />
      </main>
    </div>
  );
};

export default NotificationPage;
