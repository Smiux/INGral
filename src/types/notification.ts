export interface Notification {
  id: string;
  user_id: string;
  actor_id?: string;
  notification_type: NotificationType;
  content: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 
  | 'comment'      // 评论通知
  | 'article_update' // 文章更新通知
  | 'system'       // 系统通知
  | 'mention';     // @提及通知

export interface NotificationWithActor extends Notification {
  actor?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}
