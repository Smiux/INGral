import { supabase } from '../lib/supabase';
import { Notification, NotificationType, NotificationWithActor } from '../types/notification';
import { cache } from '../utils/cache';

class NotificationService {
  // 获取用户通知列表（带缓存）
  async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    includeRead: boolean = true
  ): Promise<NotificationWithActor[]> {
    const cacheKey = `notifications_${userId}_${limit}_${offset}_${includeRead}`;
    
    // 当offset为0时尝试从缓存获取（最新的通知）
    if (offset === 0) {
      const cachedNotifications = cache.get<NotificationWithActor[]>(cacheKey);
      if (cachedNotifications !== undefined) {
        return cachedNotifications;
      }
    }

    try {
      // 创建查询对象并直接设置所有参数
      interface NotificationQueryConfig {
        from: string;
        select: string;
        where: {
          user_id: string;
          is_read?: boolean;
        };
        order: { 
          column: string;
          ascending: boolean;
        };
        limit: number;
        offset: number;
      }
      
      const queryConfig: NotificationQueryConfig = {
        from: 'notifications',
        select: '*, actor:users!actor_id(id, username, avatar_url)',
        where: {
          user_id: userId,
          ...(!includeRead && { is_read: false })
        },
        order: { column: 'created_at', ascending: false },
        limit,
        offset
      };

      // 使用原始查询方法避免链式调用的类型问题
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const result = await supabase.from(queryConfig.from)
        .select(queryConfig.select)
        .eq('user_id', queryConfig.where.user_id)
        .order(queryConfig.order.column, { ascending: queryConfig.order.ascending })
        .limit(queryConfig.limit);


      
      // 定义通知项的接口
      interface RawNotificationItem {
        id?: string;
        user_id?: string;
        actor_id?: string;
        notification_type?: string;
        type?: string;
        content?: string;
        reference_id?: string | null;
        is_read?: boolean;
        created_at?: string;
        updated_at?: string;
        actor?: {
          id?: string;
          username?: string;
          avatar_url?: string;
          avatar?: string;
        };
      }

      // 如果需要筛选未读通知
      const filteredResult = !includeRead && Array.isArray(result.data) ? 
        (result.data as RawNotificationItem[]).filter(item => typeof item.is_read === 'boolean' && !item.is_read) : result.data;

      if (result.error) {
        console.error('获取通知失败:', result.error);
        throw new Error('获取通知失败');
      }

      // 处理数据格式 - 安全类型转换
        const data = filteredResult || [];
        const notifications = Array.isArray(data) ? 
          (data as RawNotificationItem[]).map(item => ({
            id: item.id || '',
            user_id: item.user_id || '',
            actor_id: item.actor_id || '',
            notification_type: item.notification_type || item.type || '',
            content: item.content || '',
            reference_id: item.reference_id || null,
            is_read: typeof item.is_read === 'boolean' ? item.is_read : false,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || undefined,
            actor: item.actor ? {
              id: item.actor.id || '',
              username: item.actor.username || '',
              avatar_url: item.actor.avatar_url || item.actor.avatar || ''
            } : undefined
          })) : [];

      // 缓存最新的通知5秒
      if (offset === 0) {
        cache.set(cacheKey, notifications, 5);
      }

      // 确保返回类型正确
      return notifications as NotificationWithActor[];
    } catch (error) {
      console.error('获取用户通知异常:', error);
      throw error;
    }
  }

  // 获取未读通知数量（带缓存）
  async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = `unread_count_${userId}`;
    
    // 尝试从缓存获取
    const cachedCount = cache.get<number>(cacheKey);
    if (cachedCount !== undefined) {
      return cachedCount;
    }

    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('获取未读通知数量失败:', error);
        return 0;
      }

      const countValue = count || 0;
      // 缓存10秒
      cache.set(cacheKey, countValue, 10);
      return countValue;
    } catch (error) {
      console.error('获取未读通知数量异常:', error);
      return 0;
    }
  }

  // 标记通知为已读
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('标记通知已读失败:', error);
        return false;
      }

      // 清除相关缓存
      this.clearUserCache(userId);

      return true;
    } catch (error) {
      console.error('标记通知已读异常:', error);
      return false;
    }
  }

  // 标记所有通知为已读
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);

      if (error) {
        console.error('标记所有通知已读失败:', error);
        return false;
      }

      // 清除相关缓存
      this.clearUserCache(userId);

      return true;
    } catch (error) {
      console.error('标记所有通知已读异常:', error);
      return false;
    }
  }

  // 删除通知
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('删除通知失败:', error);
        return false;
      }

      // 清除相关缓存
      this.clearUserCache(userId);

      return true;
    } catch (error) {
      console.error('删除通知异常:', error);
      return false;
    }
  }

  // 创建新通知
  async createNotification(data: {
    user_id: string;
    actor_id?: string;
    notification_type: NotificationType;
    content: string;
    reference_id?: string;
  }): Promise<Notification | null> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('创建通知失败:', error);
        return null;
      }

      // 清除相关缓存
      this.clearUserCache(data.user_id);

      return notification;
    } catch (error) {
      console.error('创建通知异常:', error);
      return null;
    }
  }

  // 清除用户的通知缓存
  private clearUserCache(userId: string): void {
    try {
      // 获取所有缓存键
      const keys = cache.keys() as string[];
      // 删除与该用户相关的所有缓存
      keys.forEach((key) => {
        if (typeof key === 'string' && (
            key.startsWith(`unread_count_${userId}`) || 
            key.startsWith(`notifications_${userId}`) ||
            key.startsWith(`notifications:${userId}`) || 
            key === `notifications:unread:${userId}`)) {
          cache.delete(key);
        }
      });
    } catch (error) {
      console.error('清除通知缓存失败:', error);
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;
